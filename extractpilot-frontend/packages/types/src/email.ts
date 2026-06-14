enum EmailProvider {
  Gmail = "gmail",
  Zoho = "zoho",
  Outlook = "outlook",
  /** Generic IMAP (Yahoo, iCloud, custom servers, etc.) */
  Imap = "imap",
}


interface SavedEmailRow {
  id: string;
  processingStatus?: ProcessingStatus;
};


enum ProcessingStatus {
  Pending = "pending",
  Processing = "processing",
  Completed = "completed",
  Failed = "failed",
  Partial = "partial",
  Skipped = "skipped",
}

enum AttachmentProcessingStatus {
  Pending = "pending",
  Processing = "processing",
  Completed = "completed",
  Failed = "failed",
  Skipped = "skipped",
  Unsupported = "unsupported",
}

interface EmailAttachment {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  localPath: string;
  contentId: string | null;
}

interface EmailJobPayload {
  provider: EmailProvider;
  messageId: string;
  sender: string;
  subject: string;
  rawContent: string;
  receivedAt: string;
  attachments: EmailAttachment[];
  /** Per-job schema for the active user query; null when not configured. */
  userQuerySchema: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

/** Queue payload: worker loads all required data by this DB id. */
interface EmailProcessingJob {
  /** UUID from `emails.id` */
  emailUuid: string;
}

/** One email to insert (or match) as pending before worker processing. */
interface SavePendingEmailInput {
  provider: EmailProvider;
  messageId: string;
  sender: string;
  subject: string;
  rawContent: string;
  attachmentCount: number;
  receivedAt: Date | null;
  userQueryId: string | null;
  userQuerySchema: Record<string, unknown> | null;
}

/** Active user query fields applied when saving fetched emails. */
type IngestionContext = Pick<SavePendingEmailInput, "userQueryId" | "userQuerySchema">;



/** Row returned after save — DB id plus keys for linking attachments / queue. */
interface SavedPendingEmail {
  id: string;
  provider: EmailProvider;
  messageId: string;
  /** When the message was received (IMAP). */
  receivedAt: Date | null;
  /** When the row was stored in DB (pending). */
  createdAt: Date;
  processingStatus: ProcessingStatus;
  userQueryId: string | null;
}

interface EmailRow {
  id: string;
  provider: string;
  messageId: string;
  sender: string | null;
  subject: string | null;
  rawContent: string | null;
  userQueryId?: string | null;
  userQuerySchema?: unknown;
  classificationResult?: unknown;
  parsedJson: unknown;
  attachmentCount: number;
  processingStatus: string;
  createdAt: Date;
  receivedAt?: Date | null;
  enqueueAt?: Date | null;
  processingStartedAt?: Date | null;
  processingCompletedAt?: Date | null;
}
type EmailRunnerSkipReason =
  | "no_imap_credentials"
  | "no_active_user_query"
  | "no_emails_in_mailbox_window"
  | "all_already_processed";

type EmailRunnerResult = {
  enqueued: number;
  imapFetched: number;
  activeUserQueryId: string | null;
  skipReason: EmailRunnerSkipReason | null;
  sinceHours: number;
  unreadOnly: boolean;
};


type EnqueueBatch = {
  emails: EmailJobPayload[];
  rows: SavedPendingEmail[];
  orderOffset: number;
};

type EnqueueCandidate = {
  payload: EmailJobPayload;
  row: SavedPendingEmail;
  index: number;
};


export {
  EmailProvider,
  ProcessingStatus,
  AttachmentProcessingStatus,
};

export type {
  EnqueueBatch,
  EnqueueCandidate,
  EmailAttachment,
  EmailJobPayload,
  EmailProcessingJob,
  IngestionContext,
  SavePendingEmailInput,
  SavedPendingEmail,
  EmailRow,
  SavedEmailRow,
  EmailRunnerResult,
  EmailRunnerSkipReason,
};
