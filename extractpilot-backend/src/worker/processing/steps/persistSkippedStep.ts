import type { IEmailService } from "@repo/feature-email";
import { DTO } from "@repo/dto";
import { ProcessingStatus } from "@repo/types/email";
import type { ProcessingContext } from "@repo/types/workerProcessing";
import { logPipeline, traceMeta } from "../pipelineLog";
import type { ErrorMeta, PersistSkippedDoneMeta } from "../pipelineLogTypes";
import type { IPersistSkippedProvider } from "../iProcessingProviders";
import type { PersistStepResult } from "../workerProcessingTypes";

export class PersistSkippedStep implements IPersistSkippedProvider {
  constructor(private readonly emailService: IEmailService) {}

  async run(ctx: ProcessingContext): Promise<DTO<PersistStepResult>> {
    logPipeline("4-persist-skipped", "start", traceMeta(ctx));
    try {
      const res = await this.emailService.markSkipped(ctx.emailUuid);
      if (!res.success) return res;
      const doneMeta: PersistSkippedDoneMeta = { ...traceMeta(ctx), status: ProcessingStatus.Skipped };
      logPipeline("4-persist-skipped", "done", doneMeta);
      const result: PersistStepResult = { ctx, status: ProcessingStatus.Skipped };
      return DTO.Success(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Persist skipped failed";
      const errorMeta: ErrorMeta = { ...traceMeta(ctx), message };
      logPipeline("4-persist-skipped", "error", errorMeta);
      return DTO.UnhandledError(message, e);
    }
  }
}
