import type { Database } from "@repo/db";
import type { IEmailService } from "@repo/feature-email";
import { DTO } from "@repo/dto";
import { ProcessingStatus } from "@repo/types/email";
import { dispatchExtractionEvent } from "../../../infra/workspaceIntegrations";
import type { ProcessingContext } from "@repo/types/workerProcessing";
import { toLogMetaJson } from "../../shared/logger";
import { logPipeline, traceMeta } from "../pipelineLog";
import type { ErrorMeta, PersistResultDoneMeta } from "../pipelineLogTypes";
import type { IPersistResultProvider } from "../iProcessingProviders";
import type { PersistStepResult } from "../workerProcessingTypes";

export class PersistResultStep implements IPersistResultProvider {
  constructor(
    private readonly emailService: IEmailService,
    private readonly db: Database,
  ) {}

  async run(ctx: ProcessingContext): Promise<DTO<PersistStepResult>> {
    logPipeline("6-persist-result", "start", traceMeta(ctx));
    try {
      if (!ctx.parsed) {
        return DTO.HandledError("PersistResultStep called without parsed result", null);
      }

      const hasFailure = ctx.parsed.attachments.some((a) => a.status === "failed");
      const status = hasFailure ? ProcessingStatus.Partial : ProcessingStatus.Completed;

      const res = await this.emailService.markCompleted(ctx.emailUuid, status, ctx.parsed);
      if (!res.success) {
        return DTO.HandledError(res.message, res.error);
      }

      const doneMeta: PersistResultDoneMeta = {
        ...traceMeta(ctx),
        status,
        parsedEmail: toLogMetaJson(ctx.parsed.email),
      };
      logPipeline("6-persist-result", "done", doneMeta);

      dispatchExtractionEvent(this.db, ctx.emailUuid, "extraction.completed", status);

      const result: PersistStepResult = { ctx, status };
      return DTO.Success(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Persist result failed";
      const errorMeta: ErrorMeta = { ...traceMeta(ctx), message };
      logPipeline("6-persist-result", "error", errorMeta);
      return DTO.UnhandledError(message, e);
    }
  }
}
