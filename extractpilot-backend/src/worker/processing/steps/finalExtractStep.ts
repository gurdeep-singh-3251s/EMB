import type { IFinalExtractionService } from "@repo/feature-extraction";
import { DTO } from "@repo/dto";
import type { ProcessingContext } from "@repo/types/workerProcessing";
import { toLogMetaJson } from "../../shared/logger";
import { logPipeline, pipelineDebug, traceMeta } from "../pipelineLog";
import type { ErrorMeta, FinalExtractDoneMeta, FinalExtractStartMeta } from "../pipelineLogTypes";
import type { IFinalExtractProvider } from "../iProcessingProviders";
import { buildFinalExtractInput } from "../workerProcessingTypes";

export class FinalExtractStep implements IFinalExtractProvider {
  constructor(private readonly finalExtract: IFinalExtractionService) {}

  async run(ctx: ProcessingContext): Promise<DTO<ProcessingContext>> {
    const startMeta: FinalExtractStartMeta = {
      ...traceMeta(ctx),
      attachmentTexts: ctx.attachmentRows.map((a) => ({
        filename: a.filename,
        chars: a.extractedText?.length ?? 0,
      })),
    };
    logPipeline("5-final-extract", "start", startMeta);
    try {
      if (!ctx.userQuery) {
        return DTO.HandledError("Email has no extraction request", null);
      }

      const extractInput = buildFinalExtractInput(ctx);
      const parsed = await this.finalExtract.extract(extractInput);

      const doneMeta: FinalExtractDoneMeta = {
        ...traceMeta(ctx),
        emailFields: Object.keys(parsed.email),
        attachmentStatuses: parsed.attachments.map((a) => ({
          filename: a.filename,
          status: a.status,
        })),
        parsedEmail: pipelineDebug() ? toLogMetaJson(parsed.email) : undefined,
      };
      logPipeline("5-final-extract", "done", doneMeta);

      const nextCtx: ProcessingContext = { ...ctx, parsed };
      return DTO.Success(nextCtx);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Final extract failed";
      const errorMeta: ErrorMeta = { ...traceMeta(ctx), message };
      logPipeline("5-final-extract", "error", errorMeta);
      return DTO.UnhandledError(message, e);
    }
  }
}
