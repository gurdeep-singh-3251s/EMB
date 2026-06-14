import type { IClassifyAndExtractService } from "@repo/feature-extraction";
import type { IEmailService } from "@repo/feature-email";
import { DTO } from "@repo/dto";
import type { ProcessingContext } from "@repo/types/workerProcessing";
import { toLogMetaJson } from "../../shared/logger";
import { logPipeline, pipelineDebug, traceMeta } from "../pipelineLog";
import type {ClassifyAndExtractDoneMeta, ClassifyAndExtractStartMeta, ErrorMeta} from "../pipelineLogTypes";
import type { IClassifyAndExtractProvider } from "../iProcessingProviders";
import { buildClassifyEmailInput, type ClassifyAttachmentHint } from "../workerProcessingTypes";

export class ClassifyAndExtractStep implements IClassifyAndExtractProvider {
  constructor(
    private readonly classifyAndExtract: IClassifyAndExtractService,
    private readonly emailService: IEmailService,
  ) {}

  async run(ctx: ProcessingContext): Promise<DTO<ProcessingContext>> {

    const startMeta: ClassifyAndExtractStartMeta = {
      ...traceMeta(ctx),
      userQuery: ctx.userQuery?.userQuery,
      llmCalls: 1,
    };

    logPipeline("3-classify-and-extract", "start", startMeta);
    
    try {
      if (!ctx.userQuery) {
        return DTO.HandledError("Email has no extraction request", null);
      }

      const emptyAttachments: ClassifyAttachmentHint[] = [];
      const classifyInput = buildClassifyEmailInput(ctx, emptyAttachments);
      const result = await this.classifyAndExtract.classifyAndExtract(classifyInput);

      const saveRes = await this.emailService.saveClassification(ctx.emailUuid, result.classification);
      if (!saveRes.success) return saveRes;

      const doneMeta: ClassifyAndExtractDoneMeta = {
        ...traceMeta(ctx),
        relevant: result.classification.relevant,
        confidence: result.classification.confidence,
        reason: result.classification.reason,
        likelyFields: result.classification.likelyFields,
        extracted: !!result.parsed,
        parsedEmail: pipelineDebug() && result.parsed ? toLogMetaJson(result.parsed.email) : undefined,
      };
      logPipeline("3-classify-and-extract", "done", doneMeta);

      const nextCtx: ProcessingContext = {
        ...ctx,
        classification: result.classification,
        parsed: result.parsed,
      };
      return DTO.Success(nextCtx);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Classify-and-extract failed";
      const errorMeta: ErrorMeta = { ...traceMeta(ctx), message };
      logPipeline("3-classify-and-extract", "error", errorMeta);
      return DTO.UnhandledError(message, e);
    }
  }
}
