import { DTO } from "@repo/dto";
import type { IAttachmentRepo } from "@repo/feature-attachment";
import type { IEmailService } from "@repo/feature-email";
import type { IUserQueryRepo } from "@repo/feature-user-query";
import type { Env } from "@repo/config";
import { ProcessingStatus} from "@repo/types/email";
import type { EnqueueBatch, EnqueueCandidate, EmailJobPayload, IngestionContext, SavePendingEmailInput, SavedPendingEmail, EmailRunnerResult} from "@repo/types/email";
import { buildUserQueryContext } from "../../userQueryContext";
import { log } from "../../../shared/logger";
import {createEmailProcessingQueue, enqueueEmailJobsBulk} from "../provider/emailQueueProvider";
import { getMailProviders, type MailProviderOverrides } from "../provider/getMailProviders";
import type { MailProvider } from "../provider/MailProvider";
import type { EmailService } from "./EmailService";


const TERMINAL_SKIP_ENQUEUE = new Set<ProcessingStatus>([
  ProcessingStatus.Completed,
  ProcessingStatus.Skipped,
  ProcessingStatus.Partial,
]);

class EmailServiceImpl implements EmailService {
  private readonly batchSize: number;

  constructor(
    private readonly env: Env,
    private readonly queue: ReturnType<typeof createEmailProcessingQueue>,
    private readonly emailService: IEmailService,
    private readonly attachmentRepo: IAttachmentRepo,
    private readonly userQueryRepo: IUserQueryRepo,
  ) {
    this.batchSize = Math.max(1, env.workerConcurrency);
  }

  async runner(overrides?: MailProviderOverrides): Promise<DTO<EmailRunnerResult>> {
    const cronCycleId = `cycle_${Date.now()}`;
    const mailProviders = getMailProviders(this.env, overrides);

    try {
      const sinceHours = overrides?.sinceHours ?? this.env.imapFetchSinceHours;
      const unreadOnly = overrides?.unreadOnly ?? this.env.imapUnreadOnly;
      const markSeenOnEnqueue = overrides?.markSeenOnSuccess ?? this.env.imapMarkSeenOnEnqueue;

      const baseResult = (): EmailRunnerResult => ({
        enqueued: 0,
        imapFetched: 0,
        activeUserQueryId: null,
        skipReason: null,
        sinceHours,
        unreadOnly,
      });

      log("gurdeep-cron", "info", "Fetch cycle start", {
        cronCycleId,
        sinceHours,
        unreadOnly,
        markSeenOnEnqueue,
        attachmentsRoot: this.env.attachmentsRoot,
        enqueueBatchSize: this.batchSize,
      });

      if (mailProviders.length === 0) {
        log("gurdeep-cron", "warn", "No mail providers configured — skip fetch", { cronCycleId });
        return DTO.Success({ ...baseResult(), skipReason: "no_imap_credentials" });
      }

      const activeRequest = await this.userQueryRepo.getActive();
      if (this.env.requireActiveUserQuery && !activeRequest) {
        log("gurdeep-cron", "warn", "No active user query — skip fetch", { cronCycleId });
        return DTO.Success({ ...baseResult(), skipReason: "no_active_user_query" });
      }

      const ingestion = buildUserQueryContext(activeRequest);

      const allEmails = await this.fetchAllEmails(cronCycleId, mailProviders);
      if (!allEmails.success) return allEmails;

      const imapFetched = allEmails.data.length;

      let enqueued = 0;
      if (imapFetched > 0) {
        const saved = await this.writeAllEmailsToDB(cronCycleId, allEmails.data, ingestion);
        if (!saved.success) return saved;
        enqueued += await this.enqueueInBatches(cronCycleId, allEmails.data, saved.data, ingestion);
      }

      enqueued += await this.enqueueStoredFailedEmails(cronCycleId, ingestion);

      const skipReason =
        imapFetched === 0 && enqueued === 0
          ? "no_emails_in_mailbox_window"
          : enqueued === 0
            ? "all_already_processed"
            : null;

      log("gurdeep-cron", "info", "Fetch cycle complete", { cronCycleId, enqueued, imapFetched });
      return DTO.Success({
        enqueued,
        imapFetched,
        activeUserQueryId: activeRequest?.id ?? null,
        skipReason,
        sinceHours,
        unreadOnly,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Fetch emails failed";
      log("gurdeep-cron", "error", "Fetch cycle crashed", { cronCycleId, message });
      return DTO.UnhandledError(message);
    }
  }

  private async fetchAllEmails(
    cronCycleId: string,
    mailProviders: MailProvider[],
  ): Promise<DTO<EmailJobPayload[]>> {
    const allEmails: EmailJobPayload[] = [];
    for (const provider of mailProviders) {
      const fetched = await this.fetchEmails(cronCycleId, provider);
      if (!fetched.success) return fetched;
      allEmails.push(...fetched.data);
    }
    return DTO.Success(allEmails);
  }

  private async fetchEmails(
    cronCycleId: string,
    provider: MailProvider,
  ): Promise<DTO<EmailJobPayload[]>> {
    log("gurdeep-cron", "info", "Fetching provider messages", { cronCycleId });
    const payloads = await provider.fetchRecent();
    log("gurdeep-cron", "info", "Provider fetch complete", {
      cronCycleId,
      fetched: payloads.length,
    });
    return DTO.Success(payloads);
  }

  private async writeAllEmailsToDB(
    cronCycleId: string,
    emails: EmailJobPayload[],
    ingestion: IngestionContext,
  ): Promise<DTO<SavedPendingEmail[]>> {
    const res = await this.emailService.savePendingEmails(
      this.mapEmailJobPayloadsToSavePending(emails, ingestion),
    );
    if (!res.success) {
      log("gurdeep-cron", "error", "writeAllEmailsToDB failed", {
        cronCycleId,
        message: res.message,
      });
      return DTO.UnhandledError(res.message, res.error);
    }

    const attachmentsRes = await this.writeAllAttachmentsToDB(cronCycleId, emails, res.data);
    if (!attachmentsRes.success) return attachmentsRes;

    log("gurdeep-cron", "info", "Saved all emails to DB", {
      cronCycleId,
      count: res.data.length,
    });
    return DTO.Success(res.data);
  }

  private async writeAllAttachmentsToDB(
    cronCycleId: string,
    emails: EmailJobPayload[],
    rows: SavedPendingEmail[],
  ): Promise<DTO<null>> {
    if (emails.length !== rows.length) {
      log("gurdeep-cron", "error", "Payloads/rows length mismatch", {
        cronCycleId,
        payloads: emails.length,
        rows: rows.length,
      });
      return DTO.UnhandledError("Payloads/rows length mismatch", null);
    }

    const allAttachments = emails.flatMap((payload, i) => {
      const emailId = rows[i]!.id;
      return payload.attachments.map((a) => ({
        emailId,
        filename: a.filename,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        localPath: a.localPath,
      }));
    });

    if (allAttachments.length === 0) return DTO.Success(null);

    await this.attachmentRepo.insertManyForEmails(allAttachments);
    log("gurdeep-cron", "info", "Saved all attachments to DB", {
      cronCycleId,
      count: allAttachments.length,
    });
    return DTO.Success(null);
  }

  private makeEnqueueBatches(emails: EmailJobPayload[], rows: SavedPendingEmail[]): EnqueueBatch[] {
    const batches: EnqueueBatch[] = [];
    for (let offset = 0; offset < rows.length; offset += this.batchSize) {
      batches.push({
        emails: emails.slice(offset, offset + this.batchSize),
        rows: rows.slice(offset, offset + this.batchSize),
        orderOffset: offset,
      });
    }
    return batches;
  }

  private async enqueueInBatches(
    cronCycleId: string,
    emails: EmailJobPayload[],
    rows: SavedPendingEmail[],
    ingestion: IngestionContext,
  ): Promise<number> {
    if (rows.length === 0) return 0;

    const batches = this.makeEnqueueBatches(emails, rows);
    let enqueued = 0;

    for (const batch of batches) {
      const batchRes = await this.enqueueBatch(cronCycleId, batch, ingestion);
      if (!batchRes.success) continue;
      enqueued += batchRes.data;
    }

    return enqueued;
  }

  /** Re-queue DB rows that previously failed (not only those in the current IMAP window). */
  private async enqueueStoredFailedEmails(
    cronCycleId: string,
    ingestion: IngestionContext,
  ): Promise<number> {
    const maxRequeues = this.env.maxFailedEmailRequeues;
    if (maxRequeues <= 0) return 0;

    const failedRes = await this.emailService.listFailedIdsEligibleForRetry(100, maxRequeues);
    if (!failedRes.success) {
      log("gurdeep-cron", "error", "listFailedIdsEligibleForRetry failed", {
        cronCycleId,
        message: failedRes.message,
      });
      return 0;
    }

    const failedIds = failedRes.data;
    if (failedIds.length === 0) return 0;

    const resetRes = await this.emailService.resetFailedForRetry(
      failedIds,
      ingestion.userQueryId,
      ingestion.userQuerySchema,
      maxRequeues,
    );
    if (!resetRes.success) {
      log("gurdeep-cron", "error", "resetFailedForRetry failed", {
        cronCycleId,
        message: resetRes.message,
      });
      return 0;
    }

    const rows = resetRes.data;
    if (rows.length === 0) return 0;

    log("gurdeep-cron", "info", "Re-queue stored failed emails", {
      cronCycleId,
      count: rows.length,
    });

    let enqueued = 0;
    for (let offset = 0; offset < rows.length; offset += this.batchSize) {
      const slice = rows.slice(offset, offset + this.batchSize);
      const batchRes = await this.enqueueRows(cronCycleId, slice);
      if (batchRes.success) enqueued += batchRes.data;
    }
    return enqueued;
  }

  private mapEmailJobPayloadsToSavePending(
    emails: EmailJobPayload[],
    ingestion: IngestionContext,
  ): SavePendingEmailInput[] {
    return emails.map((payload) => ({
      provider: payload.provider,
      messageId: payload.messageId,
      sender: payload.sender,
      subject: payload.subject,
      rawContent: payload.rawContent,
      attachmentCount: payload.attachments.length,
      receivedAt: new Date(payload.receivedAt),
      userQueryId: ingestion.userQueryId,
      userQuerySchema: ingestion.userQuerySchema ?? payload.userQuerySchema ?? null,
    }));
  }

  private isTerminalStatus(status: ProcessingStatus): boolean {
    return TERMINAL_SKIP_ENQUEUE.has(status);
  }

  private splitEnqueueCandidates(
    cronCycleId: string,
    emails: EmailJobPayload[],
    rows: SavedPendingEmail[],
    activeUserQueryId: string | null,
  ): { ready: EnqueueCandidate[]; needsReprocess: EnqueueCandidate[] } {
    const ready: EnqueueCandidate[] = [];
    const needsReprocess: EnqueueCandidate[] = [];

    for (let i = 0; i < emails.length; i++) {
      const payload = emails[i]!;
      const row = rows[i]!;

      if (row.processingStatus === ProcessingStatus.Processing) {
        log("gurdeep-cron", "info", "Skip enqueue — still processing", {
          cronCycleId,
          messageId: payload.messageId,
          emailUuid: row.id,
        });
        continue;
      }

      if (this.isTerminalStatus(row.processingStatus)) {
        const sameQuery =
          activeUserQueryId !== null && row.userQueryId === activeUserQueryId;
        if (sameQuery) {
          log("gurdeep-cron", "info", "Skip enqueue — already processed for this user query", {
            cronCycleId,
            messageId: payload.messageId,
            emailUuid: row.id,
            status: row.processingStatus,
            userQueryId: row.userQueryId,
          });
          continue;
        }
        log("gurdeep-cron", "info", "Reprocess — user query changed", {
          cronCycleId,
          messageId: payload.messageId,
          emailUuid: row.id,
          previousUserQueryId: row.userQueryId,
          activeUserQueryId,
        });
        needsReprocess.push({ payload, row, index: i });
        continue;
      }

      ready.push({ payload, row, index: i });
    }

    return { ready, needsReprocess };
  }

  private async enqueueBatch(
    cronCycleId: string,
    batch: EnqueueBatch,
    ingestion: IngestionContext,
  ): Promise<DTO<number>> {
    const { ready, needsReprocess } = this.splitEnqueueCandidates(
      cronCycleId,
      batch.emails,
      batch.rows,
      ingestion.userQueryId,
    );

    let candidates = ready;

    if (needsReprocess.length > 0) {
      const reprocessRes = await this.emailService.reprocessForUserQueryChange(
        needsReprocess.map((c) => c.row.id),
        ingestion.userQueryId,
        ingestion.userQuerySchema,
      );
      if (!reprocessRes.success) {
        log("gurdeep-cron", "error", "reprocessForUserQueryChange failed", {
          cronCycleId,
          message: reprocessRes.message,
        });
      } else {
        const pendingById = new Map(reprocessRes.data.map((r) => [r.id, r]));
        for (const candidate of needsReprocess) {
          const updated = pendingById.get(candidate.row.id);
          if (updated) {
            candidates.push({ ...candidate, row: updated });
          }
        }
      }
    }

    candidates = await this.resetFailedCandidates(cronCycleId, candidates, ingestion);
    if (candidates.length === 0) return DTO.Success(0);

    const emailIds = candidates.map(({ row }) => row.id);
    const enqueuedAt = new Date();

    const queueRes = await enqueueEmailJobsBulk(
      this.queue,
      emailIds.map((emailUuid) => ({ emailUuid })),
    );
    if (!queueRes.success) {
      log("gurdeep-cron", "error", "enqueueEmailJobsBulk failed", {
        cronCycleId,
        message: queueRes.message,
      });
      return DTO.UnhandledError(queueRes.message, queueRes.error);
    }

    const markRes = await this.emailService.markEnqueued(emailIds, enqueuedAt);
    if (!markRes.success) {
      log("gurdeep-cron", "error", "markEnqueued failed", {
        cronCycleId,
        message: markRes.message,
      });
      return DTO.UnhandledError(markRes.message, markRes.error);
    }
    return DTO.Success(candidates.length);
  }

  private async enqueueRows(cronCycleId: string, rows: SavedPendingEmail[]): Promise<DTO<number>> {
    if (rows.length === 0) return DTO.Success(0);

    const emailIds = rows.map((row) => row.id);
    const enqueuedAt = new Date();

    const queueRes = await enqueueEmailJobsBulk(
      this.queue,
      emailIds.map((emailUuid) => ({ emailUuid })),
    );
    if (!queueRes.success) {
      log("gurdeep-cron", "error", "enqueueEmailJobsBulk failed (failed retry)", {
        cronCycleId,
        message: queueRes.message,
      });
      return DTO.UnhandledError(queueRes.message, queueRes.error);
    }

    const markRes = await this.emailService.markEnqueued(emailIds, enqueuedAt);
    if (!markRes.success) {
      log("gurdeep-cron", "error", "markEnqueued failed (failed retry)", {
        cronCycleId,
        message: markRes.message,
      });
      return DTO.UnhandledError(markRes.message, markRes.error);
    }
    return DTO.Success(rows.length);
  }

  private async resetFailedCandidates(
    cronCycleId: string,
    candidates: EnqueueCandidate[],
    ingestion: IngestionContext,
  ): Promise<EnqueueCandidate[]> {
    const failedIds = candidates
      .filter((c) => c.row.processingStatus === ProcessingStatus.Failed)
      .map((c) => c.row.id);
    if (failedIds.length === 0) return candidates;

    const maxRequeues = this.env.maxFailedEmailRequeues;
    const resetRes = await this.emailService.resetFailedForRetry(
      failedIds,
      ingestion.userQueryId,
      ingestion.userQuerySchema,
      maxRequeues,
    );
    if (!resetRes.success) {
      log("gurdeep-cron", "error", "resetFailedForRetry failed (imap batch)", {
        cronCycleId,
        message: resetRes.message,
      });
      return candidates.filter((c) => c.row.processingStatus !== ProcessingStatus.Failed);
    }

    const pendingById = new Map(resetRes.data.map((r) => [r.id, r]));
    return candidates.flatMap((c) => {
      if (c.row.processingStatus !== ProcessingStatus.Failed) return [c];
      const updated = pendingById.get(c.row.id);
      if (!updated) {
        log("gurdeep-cron", "info", "Skip failed email — auto-retry cap reached", {
          cronCycleId,
          emailUuid: c.row.id,
          maxRequeues,
        });
        return [];
      }
      return [{ ...c, row: updated }];
    });
  }
}

export default EmailServiceImpl;
