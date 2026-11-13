import type { DTO_CODE } from "@repo/dto";
import type {
  IClassificationService,
  IFinalExtractionService,
} from "@repo/feature-extraction";
import type { ProcessingStatus } from "@repo/types/email";
import type {
  JobTrace,
  ProcessingContext,
  WorkerAttachmentRow,
} from "@repo/types/workerProcessing";

/** Reuses {@link IClassificationService.classify} input without duplicating fields. */
type ClassifyEmailInput = Parameters<IClassificationService["classify"]>[0];

type ClassifyAttachmentHint = ClassifyEmailInput["attachments"][number];

/** Reuses {@link IFinalExtractionService.extract} input without duplicating fields. */
type FinalExtractInput = Parameters<IFinalExtractionService["extract"]>[0];

type PersistStepResult = {
  ctx: ProcessingContext;
  status: ProcessingStatus;
};

type FailureHandlerInput = {
  trace: JobTrace;
  error: unknown;
};

type StepFailure = {
  code: typeof DTO_CODE.HANDLED_ERROR | typeof DTO_CODE.UNHANDLED_ERROR;
  message: string;
  error: unknown;
};

type TraceMeta = {
  emailUuid: string;
  messageId: string;
  subject: string | null;
  sender: string | null;
  attachmentCount: number;
};

type PipelineLogEvent = "start" | "done" | "skip" | "detail" | "error";

function toClassifyAttachmentHints(rows: WorkerAttachmentRow[]): ClassifyAttachmentHint[] {
  const hints: ClassifyAttachmentHint[] = [];
  for (const row of rows) {
    hints.push({ filename: row.filename, mimeType: row.mimeType });
  }
  return hints;
}

function buildClassifyEmailInput(
  ctx: ProcessingContext,
  attachments: ClassifyAttachmentHint[],
): ClassifyEmailInput {
  if (!ctx.userQuery) {
    throw new Error("buildClassifyEmailInput requires userQuery");
  }
  const input: ClassifyEmailInput = {
    userQuery: ctx.userQuery,
    subject: ctx.emailRow.subject ?? "",
    sender: ctx.emailRow.sender ?? "",
    rawContent: ctx.emailRow.rawContent ?? "",
    attachments,
    ownerUserId: ctx.ownerUserId,
  };
  return input;
}

function buildFinalExtractInput(ctx: ProcessingContext): FinalExtractInput {
  if (!ctx.userQuery) {
    throw new Error("buildFinalExtractInput requires userQuery");
  }
  const input: FinalExtractInput = {
    userQuery: ctx.userQuery,
    subject: ctx.emailRow.subject ?? "",
    sender: ctx.emailRow.sender ?? "",
    rawContent: ctx.emailRow.rawContent ?? "",
    attachmentRows: ctx.attachmentRows,
    ownerUserId: ctx.ownerUserId,
  };
  return input;
}

export type {
  ClassifyEmailInput,
  ClassifyAttachmentHint,
  FinalExtractInput,
  PersistStepResult,
  FailureHandlerInput,
  StepFailure,
  TraceMeta,
  PipelineLogEvent,
};

export { toClassifyAttachmentHints, buildClassifyEmailInput, buildFinalExtractInput };
