import type { EmailAttachmentRow } from "@repo/feature-attachment";
import type { EmailDetail } from "@repo/feature-email";
import type { UserQueryRow } from "@repo/types/userQuery";
import type {
  LoadEmailInput,
  ProcessingContext,
  WorkerAttachmentRow,
  WorkerEmailDetail,
} from "@repo/types/workerProcessing";

function toWorkerEmailDetail(emailRow: EmailDetail): WorkerEmailDetail {
  const detail: WorkerEmailDetail = {
    id: emailRow.id,
    provider: emailRow.provider,
    messageId: emailRow.messageId,
    sender: emailRow.sender,
    subject: emailRow.subject,
    rawContent: emailRow.rawContent,
    userQueryId: emailRow.userQueryId ?? null,
    userQuerySchema: emailRow.userQuerySchema ?? null,
    parsedJson: emailRow.parsedJson,
    attachmentCount: emailRow.attachmentCount,
    processingStatus: emailRow.processingStatus,
    createdAt: emailRow.createdAt,
  };
  return detail;
}

function toAttachmentRow(row: EmailAttachmentRow): WorkerAttachmentRow {
  return {
    id: row.id,
    filename: row.filename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    localPath: row.localPath,
    extractedText: row.extractedText ?? null,
    extractSource: row.extractSource ?? null,
  };
}

export function buildProcessingContext(
  input: LoadEmailInput,
  emailRow: EmailDetail,
  attachmentRows: EmailAttachmentRow[],
  userQuery: UserQueryRow | null,
): ProcessingContext {
  const ctx: ProcessingContext = {
    trace: input.trace,
    emailUuid: input.emailUuid,
    ownerUserId: emailRow.ownerUserId ?? null,
    emailRow: toWorkerEmailDetail(emailRow),
    attachmentRows: attachmentRows.map(toAttachmentRow),
    userQuery,
    classification: emailRow.classificationResult ?? null,
    parsed: null,
  };
  return ctx;
}
