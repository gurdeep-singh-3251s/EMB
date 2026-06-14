import type { IEmailService } from "@repo/feature-email";
import { DTO } from "@repo/dto";
import type { ProcessingContext } from "@repo/types/workerProcessing";
import { logPipeline, traceMeta } from "../pipelineLog";
import type { ErrorMeta } from "../pipelineLogTypes";
import type { IMarkProcessingProvider } from "../iProcessingProviders";

export class MarkProcessingStep implements IMarkProcessingProvider {
  constructor(private readonly emailService: IEmailService) {}

  async run(ctx: ProcessingContext): Promise<DTO<ProcessingContext>> {
    logPipeline("2-mark-processing", "start", traceMeta(ctx));
    try {
      const res = await this.emailService.markProcessing(ctx.emailUuid);
      if (!res.success) {
        return DTO.HandledError(res.message, res.error);
      }
      logPipeline("2-mark-processing", "done", traceMeta(ctx));
      return DTO.Success(ctx);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Mark processing failed";
      const errorMeta: ErrorMeta = { ...traceMeta(ctx), message };
      logPipeline("2-mark-processing", "error", errorMeta);
      return DTO.UnhandledError(message, e);
    }
  }
}
