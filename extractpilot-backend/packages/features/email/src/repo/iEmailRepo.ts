import type { Database } from "@repo/db";
import type { EmailDetail, EmailListItem } from "@repo/types/emailDetail";
import type { ClassificationResult } from "@repo/types/userQuery";
import type {
  ProcessingStatus,
  SavePendingEmailInput,
  SavedPendingEmail,
} from "@repo/types/email";
import type { ParsedEmailResult } from "@repo/types/parsedEmail";

export type { EmailListItem, EmailDetail };

export interface IEmailRepo {
  list(limit: number, offset: number, status?: ProcessingStatus): Promise<EmailListItem[]>;
  byId(id: string): Promise<EmailDetail | null>;
  byIds(ids: string[]): Promise<Array<EmailDetail>>;
  stats(): Promise<Record<ProcessingStatus, number>>;
  savePendingEmail(data: SavePendingEmailInput): Promise<string>;
  savePendingEmails(items: SavePendingEmailInput[]): Promise<SavedPendingEmail[]>;
  markEnqueued(ids: string[], enqueuedAt?: Date): Promise<void>;
  markProcessing(id: string): Promise<{ userQueryId: string | null }>;
  saveClassification(id: string, result: ClassificationResult): Promise<void>;
  markSkipped(id: string): Promise<{ userQueryId: string | null }>;
  markCompleted(
    id: string,
    status: ProcessingStatus,
    parsed: ParsedEmailResult,
  ): Promise<{ userQueryId: string | null }>;
  saveParsed(id: string, parsed: ParsedEmailResult, status: ProcessingStatus): Promise<void>;
  listFailedIdsEligibleForRetry(limit: number, maxRequeues: number): Promise<string[]>;
  resetFailedForRetry(
    ids: string[],
    userQueryId: string | null,
    userQuerySchema: Record<string, unknown> | null,
    maxRequeues: number,
  ): Promise<SavedPendingEmail[]>;
  reprocessForUserQueryChange(
    ids: string[],
    userQueryId: string | null,
    userQuerySchema: Record<string, unknown> | null,
  ): Promise<SavedPendingEmail[]>;
  patchHumanReview(
    id: string,
    input: {
      fields?: Record<string, unknown>;
      attachments?: Array<{ filename: string; data: Record<string, unknown> }>;
    },
  ): Promise<EmailDetail | null>;
}

export type EmailRepoDeps = { db: Database };
