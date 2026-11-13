import type { ClassificationResult } from "./userQuery";
import type { EmailProvider, ProcessingStatus } from "./email";
import type { ParsedEmailResult } from "./parsedEmail";

export interface EmailListItem {
  id: string;
  provider: EmailProvider;
  messageId: string;
  sender: string | null;
  subject: string | null;
  processingStatus: ProcessingStatus;
  attachmentCount: number;
  createdAt: Date;
}

export interface EmailDetail extends EmailListItem {
  ownerUserId?: string | null;
  rawContent: string | null;
  userQueryId?: string | null;
  userQuerySchema?: Record<string, unknown> | null;
  classificationResult?: ClassificationResult | null;
  parsedJson: ParsedEmailResult | null;
}
