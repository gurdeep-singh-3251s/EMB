import { emailAttachments } from "@repo/db/schema";
import type { Database } from "@repo/db";

export type EmailAttachmentRow = typeof emailAttachments.$inferSelect;

export interface IAttachmentRepo {
  byEmailId(emailId: string): Promise<EmailAttachmentRow[]>;
  byId(id: string): Promise<EmailAttachmentRow | null>;
  saveAttachments(
    emailId: string,
    items: Array<{
      filename: string;
      mimeType: string;
      sizeBytes: number;
      localPath: string;
    }>,
  ): Promise<void>;
  insertManyForEmails(
    items: Array<{
      emailId: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      localPath: string;
    }>,
  ): Promise<void>;
  updateParsed(
    id: string,
    data: { processingStatus: string; parsedJson?: Record<string, unknown> | null; errorMessage?: string },
  ): Promise<void>;
  saveExtractedText(
    id: string,
    data: { extractedText: string; extractSource: string; processingStatus?: string },
  ): Promise<void>;
}

export type AttachmentRepoDeps = { db: Database };
