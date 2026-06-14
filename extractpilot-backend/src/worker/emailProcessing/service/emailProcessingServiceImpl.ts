import type { Env } from "@repo/config";
import { DTO, DTO_CODE } from "@repo/dto";
import type { EmailProcessingJobInput, JobTrace } from "@repo/types/workerProcessing";
import type {
  IClassifyAndExtractProvider,
  IClassifyProvider,
  IFailureHandlerProvider,
  IFinalExtractProvider,
  ILoadEmailProvider,
  IMarkProcessingProvider,
  IParseAttachmentsProvider,
  IPersistResultProvider,
  IPersistSkippedProvider,
} from "../../processing/iProcessingProviders";
import { logPipeline } from "../../processing/pipelineLog";
import type { JobDoneMeta, JobStartMeta } from "../../processing/pipelineLogTypes";
import type { FailureHandlerInput, StepFailure } from "../../processing/workerProcessingTypes";
import { log } from "../../shared/logger";
import type { EmailProcessingService } from "./emailProcessingService";

class EmailProcessingServiceImpl implements EmailProcessingService {
  constructor(
    private readonly env: Env,
    private readonly loadEmail: ILoadEmailProvider,
    private readonly markProcessing: IMarkProcessingProvider,
    private readonly classify: IClassifyProvider,
    private readonly classifyAndExtract: IClassifyAndExtractProvider,
    private readonly persistSkipped: IPersistSkippedProvider,
    private readonly parseAttachments: IParseAttachmentsProvider,
    private readonly finalExtract: IFinalExtractProvider,
    private readonly persist: IPersistResultProvider,
    private readonly failure: IFailureHandlerProvider,
  ) {}

  async process(input: EmailProcessingJobInput): Promise<DTO<null>> {
    const trace: JobTrace = {
      attemptsMade: input.attemptsMade,
      emailUuid: input.data.emailUuid,
    };

    log("worker", "info", "Job received", trace);
    const jobStartMeta: JobStartMeta = {
      ...trace,
      paddleMode: this.env.paddleOcr.apiMode,
      pipelineDebug: this.env.pipelineDebug,
    };
    logPipeline("0-job", "start", jobStartMeta);

    const loaded = await this.loadEmail.run({ emailUuid: trace.emailUuid, trace });
    if (!loaded.success) return this.onStepFailure(trace, "Load email failed", loaded);

    const marked = await this.markProcessing.run(loaded.data);
    if (!marked.success) return this.onStepFailure(trace, "Mark processing failed", marked);

    const hasAttachments = marked.data.attachmentRows.length > 0;

    if (!hasAttachments) {
      const email = await this.classifyAndExtract.run(marked.data);
      if (!email.success) return this.onStepFailure(trace, "Classify-and-extract failed", email);

      if (!email.data.classification?.relevant) {
        const skipped = await this.persistSkipped.run(email.data);
        if (!skipped.success) return this.onStepFailure(trace, "Persist skipped failed", skipped);
        const doneMeta: JobDoneMeta = {
          ...trace,
          outcome: "skipped-not-relevant",
          path: "single-llm-body-only",
          llmCalls: 1,
        };
        logPipeline("0-job", "done", doneMeta);
        return DTO.Success(null);
      }

      const persisted = await this.persist.run(email.data);
      if (!persisted.success) return this.onStepFailure(trace, "Persist result failed", persisted);
      const doneMeta: JobDoneMeta = {
        ...trace,
        status: persisted.data.status,
        path: "single-llm-body-only",
        llmCalls: 1,
      };
      logPipeline("0-job", "done", doneMeta);
      return DTO.Success(null);
    }

    const classified = await this.classify.run(marked.data);
    if (!classified.success) return this.onStepFailure(trace, "Classify failed", classified);

    if (!classified.data.classification?.relevant) {
      const skipped = await this.persistSkipped.run(classified.data);
      if (!skipped.success) return this.onStepFailure(trace, "Persist skipped failed", skipped);
      const doneMeta: JobDoneMeta = {
        ...trace,
        outcome: "skipped-not-relevant",
        path: "classify-only-skip",
        llmCalls: 1,
      };
      logPipeline("0-job", "done", doneMeta);
      return DTO.Success(null);
    }

    const parsedAttachments = await this.parseAttachments.run(classified.data);
    if (!parsedAttachments.success) {
      return this.onStepFailure(trace, "Parse attachments failed", parsedAttachments);
    }

    const extracted = await this.finalExtract.run(parsedAttachments.data);
    if (!extracted.success) return this.onStepFailure(trace, "Final extract failed", extracted);

    const persisted = await this.persist.run(extracted.data);
    if (!persisted.success) return this.onStepFailure(trace, "Persist result failed", persisted);

    const doneMeta: JobDoneMeta = {
      ...trace,
      status: persisted.data.status,
      path: "classify→parse→extract",
      llmCalls: 2,
    };
    logPipeline("0-job", "done", doneMeta);
    return DTO.Success(null);
  }

  private async onStepFailure(trace: JobTrace, step: string, failed: StepFailure): Promise<DTO<null>> {
    log("worker", "error", step, { ...trace, error: failed.message });
    const failureInput: FailureHandlerInput = { trace, error: failed.message };
    await this.failure.run(failureInput);

    if (failed.code === DTO_CODE.HANDLED_ERROR) {
      return DTO.HandledError(failed.message, failed.error);
    }
    return DTO.UnhandledError(failed.message, failed.error);
  }
}

export default EmailProcessingServiceImpl;
