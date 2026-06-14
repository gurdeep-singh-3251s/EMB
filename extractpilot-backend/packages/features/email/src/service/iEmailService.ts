import type { DTO } from "@repo/dto";
import type { ClassificationResult } from "@repo/types/userQuery";
import type { ProcessingStatus, SavePendingEmailInput, SavedPendingEmail } from "@repo/types/email";
import type { ParsedEmailResult } from "@repo/types/parsedEmail";
import type { EmailDetail, EmailListItem, IEmailRepo } from "../repo/iEmailRepo";

export interface IEmailService {
  list(input: { limit?: number; offset?: number; status?: ProcessingStatus }): Promise<DTO<EmailListItem[]>>;
  byId(id: string): Promise<DTO<EmailDetail>>;
  byIdRaw(id: string): Promise<DTO<EmailDetail | null>>;
  stats(): Promise<DTO<Record<ProcessingStatus, number>>>;
  savePendingEmails(items: SavePendingEmailInput[]): Promise<DTO<SavedPendingEmail[]>>;
  markEnqueued(ids: string[], enqueuedAt?: Date): Promise<DTO<null>>;
  markProcessing(id: string): Promise<DTO<null>>;
  saveClassification(id: string, result: ClassificationResult): Promise<DTO<null>>;
  markSkipped(id: string): Promise<DTO<null>>;
  markCompleted(id: string, status: ProcessingStatus, parsed: ParsedEmailResult): Promise<DTO<null>>;
  listFailedIdsEligibleForRetry(limit: number, maxRequeues: number): Promise<DTO<string[]>>;
  resetFailedForRetry(
    ids: string[],
    userQueryId: string | null,
    userQuerySchema: Record<string, unknown> | null,
    maxRequeues: number,
  ): Promise<DTO<SavedPendingEmail[]>>;
  reprocessForUserQueryChange(
    ids: string[],
    userQueryId: string | null,
    userQuerySchema: Record<string, unknown> | null,
  ): Promise<DTO<SavedPendingEmail[]>>;
  patchHumanReview(
    id: string,
    input: {
      fields?: Record<string, unknown>;
      attachments?: Array<{ filename: string; data: Record<string, unknown> }>;
    },
  ): Promise<DTO<EmailDetail>>;
}

export type EmailServiceDeps = {
  repo: IEmailRepo;
  progressPublisher?: import("@repo/feature-queue").ExtractionProgressPublisher;
};
