import type { ProcessingStatus } from "@repo/types/email";
import type { JobTrace, ProcessingContext } from "@repo/types/workerProcessing";
import type { LogMetaJson } from "../shared/logger";
import type { PipelineLogEvent, TraceMeta } from "./workerProcessingTypes";

export type { PipelineLogEvent, TraceMeta };

export type PersistSkippedDoneMeta = TraceMeta & {
  status: ProcessingStatus;
};

export type JobStartMeta = JobTrace & {
  paddleMode: string;
  pipelineDebug: boolean;
};

export type JobDoneMeta = JobTrace & {
  status?: string;
  outcome?: string;
  path: string;
  llmCalls: number;
};

export type ClassifyStepStartMeta = TraceMeta & {
  userQuery: string | undefined;
};

export type ClassifyStepDoneMeta = TraceMeta & {
  relevant: boolean;
  confidence: number | undefined;
  reason: string | undefined;
  likelyFields: string[] | undefined;
  attachmentHints: number;
  bodyPreview: string | undefined;
};

export type ClassifyAndExtractStartMeta = TraceMeta & {
  userQuery: string | undefined;
  llmCalls: number;
};

export type ClassifyAndExtractDoneMeta = TraceMeta & {
  relevant: boolean;
  confidence: number | undefined;
  reason: string | undefined;
  likelyFields: string[] | undefined;
  extracted: boolean;
  parsedEmail: LogMetaJson | undefined;
};

export type LoadEmailStartMeta = {
  emailUuid: string;
};

export type LoadEmailErrorMeta = {
  message: string;
};

export type LoadEmailAttachmentSummary = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

export type LoadEmailDoneMeta = {
  emailUuid: string;
  subject: string | null;
  attachments: LoadEmailAttachmentSummary[];
  userQueryId: string | null;
};

export type ParseAttachmentSummary = {
  filename: string;
  source: string;
  textLength: number;
};

export type ParseAttachmentsSkipMeta = TraceMeta & {
  reason: string;
};

export type ParseAttachmentsDoneMeta = TraceMeta & {
  parsed: ParseAttachmentSummary[];
  savedToDb: number;
};

export type FinalExtractStartMeta = TraceMeta & {
  attachmentTexts: { filename: string; chars: number }[];
};

export type FinalExtractDoneMeta = TraceMeta & {
  emailFields: string[];
  attachmentStatuses: { filename: string; status: string }[];
  parsedEmail: LogMetaJson | undefined;
};

export type PersistResultDoneMeta = TraceMeta & {
  status: string;
  parsedEmail: LogMetaJson;
};

export type ErrorMeta = TraceMeta & {
  message: string;
};

export type PipelineLogMeta =
  | TraceMeta
  | JobStartMeta
  | JobDoneMeta
  | LoadEmailStartMeta
  | LoadEmailDoneMeta
  | LoadEmailErrorMeta
  | ClassifyStepStartMeta
  | ClassifyStepDoneMeta
  | ClassifyAndExtractStartMeta
  | ClassifyAndExtractDoneMeta
  | ParseAttachmentsSkipMeta
  | ParseAttachmentsDoneMeta
  | FinalExtractStartMeta
  | FinalExtractDoneMeta
  | PersistResultDoneMeta
  | PersistSkippedDoneMeta
  | ErrorMeta;

export function traceMeta(ctx: ProcessingContext): TraceMeta {
  const meta: TraceMeta = {
    emailUuid: ctx.emailUuid,
    messageId: ctx.emailRow.messageId,
    subject: ctx.emailRow.subject,
    sender: ctx.emailRow.sender,
    attachmentCount: ctx.attachmentRows.length,
  };
  return meta;
}
