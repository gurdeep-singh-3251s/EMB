import { DTO } from "@repo/dto";
import type { IClassificationService } from "@repo/feature-extraction";
import type { IEmailService } from "@repo/feature-email";
import type { ProcessingContext } from "@repo/types/workerProcessing";
import { logPipeline, pipelineDebug, traceMeta } from "../pipelineLog";
import type {
  ClassifyStepDoneMeta,
  ClassifyStepStartMeta,
  ErrorMeta,
} from "../pipelineLogTypes";
import type { IClassifyProvider } from "../iProcessingProviders";
import {
  buildClassifyEmailInput,
  toClassifyAttachmentHints,
} from "../workerProcessingTypes";

export class ClassifyStep implements IClassifyProvider {
  constructor(
    private readonly classify: IClassificationService,
    private readonly emailService: IEmailService,
  ) {}

  async run(ctx: ProcessingContext): Promise<DTO<ProcessingContext>> {
    const startMeta: ClassifyStepStartMeta = {
      ...traceMeta(ctx),
      userQuery: ctx.userQuery?.userQuery,
    };
    logPipeline("3-classify", "start", startMeta);
    try {
      if (!ctx.userQuery) {
        return DTO.HandledError("Email has no user query", null);
      }

      const classifyInput = buildClassifyEmailInput(
        ctx,
        toClassifyAttachmentHints(ctx.attachmentRows),
      );
      const classification = await this.classify.classify(classifyInput);

      const saveRes = await this.emailService.saveClassification(ctx.emailUuid, classification);
      if (!saveRes.success) return saveRes;

      const doneMeta: ClassifyStepDoneMeta = {
        ...traceMeta(ctx),
        relevant: classification.relevant,
        confidence: classification.confidence,
        reason: classification.reason,
        likelyFields: classification.likelyFields,
        attachmentHints: ctx.attachmentRows.length,
        bodyPreview: pipelineDebug()
          ? (ctx.emailRow.rawContent ?? "").slice(0, 200)
          : undefined,
      };
      logPipeline("3-classify", "done", doneMeta);

      const nextCtx: ProcessingContext = { ...ctx, classification };
      return DTO.Success(nextCtx);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Classify failed";
      const errorMeta: ErrorMeta = { ...traceMeta(ctx), message };
      logPipeline("3-classify", "error", errorMeta);
      return DTO.UnhandledError(message, e);
    }
  }
}
