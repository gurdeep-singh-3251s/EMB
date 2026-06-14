import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { desc } from "drizzle-orm/sql/expressions/select";
import { count } from "drizzle-orm/sql/functions/aggregate";
import { emails } from "@repo/db/schema";
import type { ClassificationResult } from "@repo/types/userQuery";
import {
  EmailProvider,
  ProcessingStatus,
  type EmailRow,
  type SavePendingEmailInput,
  type SavedPendingEmail,
} from "@repo/types/email";
import type { ParsedEmailResult, HumanReviewMeta } from "@repo/types/parsedEmail";
import type { EmailDetail, EmailListItem, EmailRepoDeps, IEmailRepo } from "./iEmailRepo";
/** Mirrors `emails` table columns — used when IDE cannot infer Drizzle row types. */


function parseEmailProvider(value: string): EmailProvider {
  if (Object.values(EmailProvider).includes(value as EmailProvider)) return value as EmailProvider;
  if (value === "yahoo" || value === "icloud") return EmailProvider.Imap;
  throw new Error(`Invalid email provider in DB: ${value}`);
}

function asRecordOrNull(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value !== "object") return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asClassification(value: unknown): ClassificationResult | null {
  if (!value || typeof value !== "object") return null;
  const o = value as { relevant?: unknown };
  if (typeof o.relevant !== "boolean") return null;
  return {
    relevant: o.relevant,
    confidence: typeof (o as { confidence?: unknown }).confidence === "number"
      ? (o as { confidence: number }).confidence
      : undefined,
    reason: typeof (o as { reason?: unknown }).reason === "string"
      ? (o as { reason: string }).reason
      : undefined,
  };
}

function mapEmailDetail(row: EmailRow): EmailDetail {
  return {
    id: row.id,
    provider: parseEmailProvider(row.provider),
    messageId: row.messageId,
    sender: row.sender,
    subject: row.subject,
    processingStatus: row.processingStatus as ProcessingStatus,
    attachmentCount: row.attachmentCount,
    createdAt: row.createdAt,
    rawContent: row.rawContent,
    userQueryId: row.userQueryId ?? null,
    userQuerySchema: asRecordOrNull(row.userQuerySchema),
    classificationResult: asClassification(row.classificationResult),
    parsedJson: row.parsedJson as ParsedEmailResult | null,
  };
}

function mapSavedPendingRow(row: {
  id: string;
  provider: string;
  messageId: string;
  receivedAt: Date | null;
  createdAt: Date;
  processingStatus: string;
  userQueryId: string | null;
}): SavedPendingEmail {
  return {
    id: row.id,
    provider: parseEmailProvider(row.provider),
    messageId: row.messageId,
    receivedAt: row.receivedAt ?? null,
    createdAt: row.createdAt,
    processingStatus: row.processingStatus as ProcessingStatus,
    userQueryId: row.userQueryId ?? null,
  };
}

export class EmailRepo implements IEmailRepo {
  constructor(private readonly deps: EmailRepoDeps) {}

  async list(limit: number, offset: number, status?: ProcessingStatus): Promise<EmailListItem[]> {
    const rows = await this.deps.db
      .select()
      .from(emails)
      .where(status ? eq(emails.processingStatus, status) : undefined)
      .orderBy(desc(emails.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map((r: EmailRow) => ({
      id: r.id,
      provider: parseEmailProvider(r.provider),
      messageId: r.messageId,
      sender: r.sender,
      subject: r.subject,
      processingStatus: r.processingStatus as ProcessingStatus,
      attachmentCount: r.attachmentCount,
      createdAt: r.createdAt,
    }));
  }

  async byId(id: string): Promise<EmailDetail | null> {
    const [row] = await this.deps.db.select().from(emails).where(eq(emails.id, id)).limit(1);
    if (!row) return null;
    return mapEmailDetail(row as EmailRow);
  }

  async byIds(ids: string[]): Promise<Array<EmailDetail>> {
    if (ids.length === 0) return [];
    const rows = await this.deps.db.select().from(emails).where(inArray(emails.id, ids));
    return rows.map((row: EmailRow) => mapEmailDetail(row));
  }

  async stats(): Promise<Record<ProcessingStatus, number>> {
    const rows = await this.deps.db
      .select({ status: emails.processingStatus, total: count() })
      .from(emails)
      .groupBy(emails.processingStatus);

    const base: Record<ProcessingStatus, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      partial: 0,
      skipped: 0,
    };
    for (const r of rows) {
      base[r.status as ProcessingStatus] = Number(r.total);
    }
    return base;
  }

  async savePendingEmail(data: SavePendingEmailInput): Promise<string> {
    const [existing] = await this.deps.db
      .select({ id: emails.id })
      .from(emails)
      .where(and(eq(emails.provider, data.provider), eq(emails.messageId, data.messageId)))
      .limit(1);

    if (existing) return existing.id;

    const createdAt = new Date();
    const [inserted] = await this.deps.db
      .insert(emails)
      .values({
        provider: data.provider,
        messageId: data.messageId,
        sender: data.sender,
        subject: data.subject,
        rawContent: data.rawContent,
        attachmentCount: data.attachmentCount,
        processingStatus: "pending",
        receivedAt: data.receivedAt,
        userQueryId: data.userQueryId,
        userQuerySchema: data.userQuerySchema,
        createdAt,
      })
      .returning({ id: emails.id });

    return inserted!.id;
  }

  async savePendingEmails(items: SavePendingEmailInput[]): Promise<SavedPendingEmail[]> {
    if (items.length === 0) return [];

    const createdAt = new Date();
    // Insert all new rows in one query (pending state). Existing rows are ignored.
    await this.deps.db
      .insert(emails)
      .values(
        items.map((i) => ({
          provider: i.provider,
          messageId: i.messageId,
          sender: i.sender,
          subject: i.subject,
          rawContent: i.rawContent,
          attachmentCount: i.attachmentCount,
          processingStatus: "pending",
          receivedAt: i.receivedAt,
          userQueryId: i.userQueryId,
          userQuerySchema: i.userQuerySchema,
          createdAt,
        })),
      )
      .onConflictDoNothing();

    // Fetch ids for all items (both inserted and pre-existing) and preserve input order.
    const messageIds = items.map((i) => i.messageId);
    const providers = Array.from(new Set(items.map((i) => i.provider)));

    const rows = await this.deps.db
      .select({
        id: emails.id,
        provider: emails.provider,
        messageId: emails.messageId,
        receivedAt: emails.receivedAt,
        createdAt: emails.createdAt,
        processingStatus: emails.processingStatus,
        userQueryId: emails.userQueryId,
      })
      .from(emails)
      .where(and(inArray(emails.messageId, messageIds), inArray(emails.provider, providers)));

    const byKey = new Map<
      string,
      {
        id: string;
        receivedAt: Date | null;
        createdAt: Date;
        processingStatus: string;
        userQueryId: string | null;
      }
    >();
    for (const r of rows) {
      byKey.set(`${r.provider}__${r.messageId}`, {
        id: r.id,
        receivedAt: r.receivedAt ?? null,
        createdAt: r.createdAt,
        processingStatus: r.processingStatus,
        userQueryId: r.userQueryId ?? null,
      });
    }

    return items.map((i) => {
      const row = byKey.get(`${i.provider}__${i.messageId}`);
      if (!row) throw new Error(`savePendingEmails: missing id for ${i.provider} ${i.messageId}`);
      return {
        id: row.id,
        provider: i.provider,
        messageId: i.messageId,
        receivedAt: row.receivedAt,
        createdAt: row.createdAt,
        processingStatus: row.processingStatus as ProcessingStatus,
        userQueryId: row.userQueryId,
      };
    });
  }

  async markEnqueued(ids: string[], enqueuedAt = new Date()): Promise<void> {
    if (ids.length === 0) return;
    await this.deps.db
      .update(emails)
      .set({ enqueueAt: enqueuedAt })
      .where(inArray(emails.id, ids));
  }

  async markProcessing(id: string): Promise<{ userQueryId: string | null }> {
    const [row] = await this.deps.db
      .update(emails)
      .set({ processingStatus: "processing", processingStartedAt: new Date() })
      .where(eq(emails.id, id))
      .returning({ userQueryId: emails.userQueryId });
    return { userQueryId: row?.userQueryId ?? null };
  }

  async saveClassification(id: string, result: ClassificationResult): Promise<void> {
    await this.deps.db
      .update(emails)
      .set({ classificationResult: result })
      .where(eq(emails.id, id));
  }

  async markSkipped(id: string): Promise<{ userQueryId: string | null }> {
    const [row] = await this.deps.db
      .update(emails)
      .set({
        processingStatus: ProcessingStatus.Skipped,
        processingCompletedAt: new Date(),
        parsedJson: { email: {}, attachments: [] },
      })
      .where(eq(emails.id, id))
      .returning({ userQueryId: emails.userQueryId });
    return { userQueryId: row?.userQueryId ?? null };
  }

  async markCompleted(
    id: string,
    status: ProcessingStatus,
    parsed: ParsedEmailResult,
  ): Promise<{ userQueryId: string | null }> {
    const [row] = await this.deps.db
      .update(emails)
      .set({
        parsedJson: parsed,
        processingStatus: status,
        processingCompletedAt: new Date(),
      })
      .where(eq(emails.id, id))
      .returning({ userQueryId: emails.userQueryId });
    return { userQueryId: row?.userQueryId ?? null };
  }

  async saveParsed(id: string, parsed: ParsedEmailResult, status: ProcessingStatus): Promise<void> {
    await this.deps.db
      .update(emails)
      .set({ parsedJson: parsed, processingStatus: status, processingCompletedAt: new Date() })
      .where(eq(emails.id, id));
  }

  async listFailedIdsEligibleForRetry(limit: number, maxRequeues: number): Promise<string[]> {
    if (maxRequeues <= 0) return [];

    const rows = await this.deps.db
      .select({ id: emails.id })
      .from(emails)
      .where(
        and(
          eq(emails.processingStatus, ProcessingStatus.Failed),
          lt(emails.failedRequeueCount, maxRequeues),
        ),
      )
      .orderBy(desc(emails.createdAt))
      .limit(limit);
    return rows.map((r: { id: string }) => r.id);
  }

  async resetFailedForRetry(
    ids: string[],
    userQueryId: string | null,
    userQuerySchema: Record<string, unknown> | null,
    maxRequeues: number,
  ): Promise<SavedPendingEmail[]> {
    if (ids.length === 0 || maxRequeues <= 0) return [];

    const rows = await this.deps.db
      .update(emails)
      .set({
        processingStatus: ProcessingStatus.Pending,
        userQueryId,
        userQuerySchema,
        parsedJson: null,
        classificationResult: null,
        processingStartedAt: null,
        processingCompletedAt: null,
        enqueueAt: null,
        failedRequeueCount: sql`${emails.failedRequeueCount} + 1`,
      })
      .where(
        and(
          inArray(emails.id, ids),
          eq(emails.processingStatus, ProcessingStatus.Failed),
          lt(emails.failedRequeueCount, maxRequeues),
        ),
      )
      .returning({
        id: emails.id,
        provider: emails.provider,
        messageId: emails.messageId,
        receivedAt: emails.receivedAt,
        createdAt: emails.createdAt,
        processingStatus: emails.processingStatus,
        userQueryId: emails.userQueryId,
      });

    return rows.map(mapSavedPendingRow);
  }

  async reprocessForUserQueryChange(
    ids: string[],
    userQueryId: string | null,
    userQuerySchema: Record<string, unknown> | null,
  ): Promise<SavedPendingEmail[]> {
    if (ids.length === 0) return [];

    const rows = await this.deps.db
      .update(emails)
      .set({
        processingStatus: ProcessingStatus.Pending,
        userQueryId,
        userQuerySchema,
        parsedJson: null,
        classificationResult: null,
        processingStartedAt: null,
        processingCompletedAt: null,
        enqueueAt: null,
      })
      .where(
        and(
          inArray(emails.id, ids),
          inArray(emails.processingStatus, [
            ProcessingStatus.Completed,
            ProcessingStatus.Skipped,
            ProcessingStatus.Partial,
          ]),
        ),
      )
      .returning({
        id: emails.id,
        provider: emails.provider,
        messageId: emails.messageId,
        receivedAt: emails.receivedAt,
        createdAt: emails.createdAt,
        processingStatus: emails.processingStatus,
        userQueryId: emails.userQueryId,
      });

    return rows.map(mapSavedPendingRow);
  }

  async patchHumanReview(
    id: string,
    input: {
      fields?: Record<string, unknown>;
      attachments?: Array<{ filename: string; data: Record<string, unknown> }>;
    },
  ): Promise<EmailDetail | null> {
    const row = await this.byId(id);
    if (!row) return null;

    const editable = new Set<ProcessingStatus>([
      ProcessingStatus.Completed,
      ProcessingStatus.Partial,
      ProcessingStatus.Skipped,
      ProcessingStatus.Failed,
    ]);
    if (!editable.has(row.processingStatus)) {
      throw new Error("Email is still processing — wait until extraction finishes.");
    }

    const hasFieldEdits = input.fields !== undefined && Object.keys(input.fields).length > 0;
    const hasAttachmentEdits = (input.attachments?.length ?? 0) > 0;
    if (!hasFieldEdits && !hasAttachmentEdits) {
      throw new Error("No corrections provided.");
    }

    const existing = (row.parsedJson ?? { email: {}, attachments: [] }) as ParsedEmailResult;
    const mergedEmail = { ...(existing.email ?? {}), ...(input.fields ?? {}) };

    const attachmentByName = new Map(
      (existing.attachments ?? []).map((att) => [att.filename, { ...att }]),
    );
    const editedAttachmentNames: string[] = [];
    for (const patch of input.attachments ?? []) {
      const current = attachmentByName.get(patch.filename);
      if (!current) continue;
      current.data = { ...(current.data ?? {}), ...patch.data };
      attachmentByName.set(patch.filename, current);
      editedAttachmentNames.push(patch.filename);
    }

    const priorReview = existing.humanReview;
    const editedFields = new Set(priorReview?.editedFields ?? []);
    for (const key of Object.keys(input.fields ?? {})) {
      editedFields.add(key);
    }

    const humanReview: HumanReviewMeta = {
      lastEditedAt: new Date().toISOString(),
      editedFields: Array.from(editedFields),
      editedAttachments: Array.from(
        new Set([...(priorReview?.editedAttachments ?? []), ...editedAttachmentNames]),
      ),
    };

    const parsed: ParsedEmailResult = {
      email: mergedEmail,
      attachments: Array.from(attachmentByName.values()),
      humanReview,
    };

    const nextStatus =
      row.processingStatus === ProcessingStatus.Skipped
        ? ProcessingStatus.Partial
        : row.processingStatus;

    await this.deps.db
      .update(emails)
      .set({
        parsedJson: parsed,
        processingStatus: nextStatus,
        processingCompletedAt: new Date(),
      })
      .where(eq(emails.id, id));

    return this.byId(id);
  }
}
