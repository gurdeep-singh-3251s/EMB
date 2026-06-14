import { DTO } from "@repo/dto";
import type { ClassificationResult } from "@repo/types/userQuery";
import { ProcessingStatus, type SavePendingEmailInput, type SavedPendingEmail } from "@repo/types/email";
import type { ParsedEmailResult } from "@repo/types/parsedEmail";
import type { EmailDetail, EmailListItem } from "../repo/iEmailRepo";
import type { EmailServiceDeps, IEmailService } from "./iEmailService";

export class EmailService implements IEmailService {
  constructor(private readonly deps: EmailServiceDeps) {}

  async list(input: {
    limit?: number;
    offset?: number;
    status?: ProcessingStatus;
  }): Promise<DTO<EmailListItem[]>> {
    const data = await this.deps.repo.list(input.limit ?? 50, input.offset ?? 0, input.status);
    return DTO.Success(data);
  }

  async byId(id: string): Promise<DTO<EmailDetail>> {
    const row = await this.deps.repo.byId(id);
    if (!row) return DTO.HandledError("Email not found");
    return DTO.Success(row);
  }

  async byIdRaw(id: string): Promise<DTO<EmailDetail | null>> {
    return DTO.Success(await this.deps.repo.byId(id));
  }

  async stats(): Promise<DTO<Record<ProcessingStatus, number>>> {
    return DTO.Success(await this.deps.repo.stats());
  }

  async savePendingEmails(items: SavePendingEmailInput[]): Promise<DTO<SavedPendingEmail[]>> {
    return DTO.Success(await this.deps.repo.savePendingEmails(items));
  }

  async markEnqueued(ids: string[], enqueuedAt?: Date): Promise<DTO<null>> {
    await this.deps.repo.markEnqueued(ids, enqueuedAt);
    return DTO.Success(null);
  }

  async markProcessing(id: string): Promise<DTO<null>> {
    const meta = await this.deps.repo.markProcessing(id);
    this.deps.progressPublisher?.emailStatus(meta.userQueryId, id, ProcessingStatus.Processing);
    return DTO.Success(null);
  }

  async saveClassification(id: string, result: ClassificationResult): Promise<DTO<null>> {
    await this.deps.repo.saveClassification(id, result);
    return DTO.Success(null);
  }

  async markSkipped(id: string): Promise<DTO<null>> {
    const meta = await this.deps.repo.markSkipped(id);
    this.deps.progressPublisher?.emailStatus(meta.userQueryId, id, ProcessingStatus.Skipped);
    return DTO.Success(null);
  }

  async markCompleted(id: string, status: ProcessingStatus, parsed: ParsedEmailResult): Promise<DTO<null>> {
    const meta = await this.deps.repo.markCompleted(id, status, parsed);
    this.deps.progressPublisher?.emailStatus(meta.userQueryId, id, status);
    return DTO.Success(null);
  }

  async listFailedIdsEligibleForRetry(limit: number, maxRequeues: number): Promise<DTO<string[]>> {
    return DTO.Success(await this.deps.repo.listFailedIdsEligibleForRetry(limit, maxRequeues));
  }

  async resetFailedForRetry(
    ids: string[],
    userQueryId: string | null,
    userQuerySchema: Record<string, unknown> | null,
    maxRequeues: number,
  ): Promise<DTO<SavedPendingEmail[]>> {
    return DTO.Success(
      await this.deps.repo.resetFailedForRetry(ids, userQueryId, userQuerySchema, maxRequeues),
    );
  }

  async reprocessForUserQueryChange(
    ids: string[],
    userQueryId: string | null,
    userQuerySchema: Record<string, unknown> | null,
  ): Promise<DTO<SavedPendingEmail[]>> {
    return DTO.Success(
      await this.deps.repo.reprocessForUserQueryChange(ids, userQueryId, userQuerySchema),
    );
  }

  async patchHumanReview(
    id: string,
    input: {
      fields?: Record<string, unknown>;
      attachments?: Array<{ filename: string; data: Record<string, unknown> }>;
    },
  ): Promise<DTO<EmailDetail>> {
    try {
      const row = await this.deps.repo.patchHumanReview(id, input);
      if (!row) return DTO.HandledError("Email not found");
      return DTO.Success(row);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save corrections";
      return DTO.HandledError(message);
    }
  }
}
