import type { Database } from "@repo/db";
import type { IFailedJobRepo } from "@repo/feature-failed-job";
import type { IEmailService } from "@repo/feature-email";
import { DTO } from "@repo/dto";
import { ProcessingStatus } from "@repo/types/email";
import { dispatchExtractionEvent } from "../../../infra/workspaceIntegrations";
import type { ParsedEmailResult } from "@repo/types/parsedEmail";
import type { IFailureHandlerProvider } from "../iProcessingProviders";
import type { FailureHandlerInput } from "../workerProcessingTypes";

const FALLBACK_PARSED: ParsedEmailResult = {
  email: { customer_name: null, issue_type: null, priority: null },
  attachments: [],
};

export class FailureHandlerStep implements IFailureHandlerProvider {
  constructor(
    private readonly emailService: IEmailService,
    private readonly failedJobRepo: IFailedJobRepo,
    private readonly db: Database,
  ) {}

  async run(input: FailureHandlerInput): Promise<DTO<null>> {
    try {
      const message = input.error instanceof Error ? input.error.message : String(input.error);

      await this.emailService.markCompleted(
        input.trace.emailUuid,
        ProcessingStatus.Failed,
        FALLBACK_PARSED,
      );
      await this.failedJobRepo.create(input.trace.emailUuid, message, input.trace.attemptsMade);
      dispatchExtractionEvent(this.db, input.trace.emailUuid, "extraction.failed", ProcessingStatus.Failed);

      return DTO.Success(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failure handler failed";
      return DTO.UnhandledError(message, e);
    }
  }
}
