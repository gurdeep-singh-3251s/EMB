import type { AttachmentProcessingStatus } from "./email";
export interface DefaultParsedEmailFields {
  customer_name: string | null;
  issue_type: string | null;
  priority: string | null;
}

export type DefaultEmailWithCustomFields = DefaultParsedEmailFields & Record<string, unknown>;

export interface HumanReviewMeta {
  lastEditedAt: string;
  editedFields: string[];
  editedAttachments?: string[];
}

export interface ParsedEmailResult<
  Email = DefaultEmailWithCustomFields,
  Attachment = Record<string, unknown>,
> {
  email: Email;
  attachments: Array<{
    filename: string;
    mimeType: string;
    localPath: string;
    status: AttachmentProcessingStatus;
    data: Attachment | null;
    error?: string;
  }>;
  humanReview?: HumanReviewMeta;
}

