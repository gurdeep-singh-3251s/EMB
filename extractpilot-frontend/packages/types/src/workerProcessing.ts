import type { UserQueryRow, ClassificationResult } from "./userQuery";
import type { ParsedEmailResult } from "./parsedEmail";
import type {
  EmailAttachment,
  EmailProcessingJob,
  EmailProvider,
  ProcessingStatus,
} from "./email";

export type JobTrace = {
  emailUuid: string;
  attemptsMade: number;
};

export type WorkerAttachmentRow = Pick<
  EmailAttachment,
  "filename" | "mimeType" | "sizeBytes" | "localPath"
> & {
  id: string;
  extractedText?: string | null;
  extractSource?: string | null;
};

export type WorkerEmailDetail = {
  id: string;
  provider: EmailProvider;
  messageId: string;
  sender: string | null;
  subject: string | null;
  rawContent: string | null;
  userQueryId?: string | null;
  userQuerySchema?: Record<string, unknown> | null;
  parsedJson: ParsedEmailResult | null;
  attachmentCount: number;
  processingStatus: ProcessingStatus;
  createdAt: Date;
};

export type ProcessingContext = {
  trace: JobTrace;
  emailUuid: string;
  emailRow: WorkerEmailDetail;
  attachmentRows: WorkerAttachmentRow[];
  userQuery: UserQueryRow | null;
  classification: ClassificationResult | null;
  parsed: ParsedEmailResult | null;
};

export type LoadEmailInput = Pick<ProcessingContext, "emailUuid" | "trace">;

export type EmailProcessingJobInput = {
  data: EmailProcessingJob;
  attemptsMade: number;
};
