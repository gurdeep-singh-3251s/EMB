import type { Database } from "@repo/db";
import type { Env } from "@repo/config";
import { createAttachmentRepo, type IAttachmentRepo } from "@repo/feature-attachment";
import { createEmailService, type IEmailService } from "@repo/feature-email";
import { createUserQueryRepo, type IUserQueryRepo } from "@repo/feature-user-query";
import { ExtractionProgressPublisher } from "@repo/feature-queue";
import { createExtractionServices, type ExtractionServices } from "@repo/feature-extraction";
import { createFailedJobRepo, type IFailedJobRepo } from "@repo/feature-failed-job";
import type { EmailProcessingService } from "./emailProcessing/service/emailProcessingService";
import EmailProcessingServiceImpl from "./emailProcessing/service/emailProcessingServiceImpl";
import { ClassifyAndExtractStep } from "./processing/steps/classifyAndExtractStep";
import { ClassifyStep } from "./processing/steps/classifyStep";
import { FailureHandlerStep } from "./processing/steps/failureHandlerStep";
import { FinalExtractStep } from "./processing/steps/finalExtractStep";
import { LoadEmailStep } from "./processing/steps/loadEmailStep";
import { MarkProcessingStep } from "./processing/steps/markProcessingStep";
import { ParseAttachmentsStep } from "./processing/steps/parseAttachmentsStep";
import { PersistResultStep } from "./processing/steps/persistResultStep";
import { PersistSkippedStep } from "./processing/steps/persistSkippedStep";

class ServiceProvider {
  private readonly emailService: IEmailService;
  private readonly attachmentRepo: IAttachmentRepo;
  private readonly failedJobRepo: IFailedJobRepo;
  private readonly userQueryRepo: IUserQueryRepo;
  private readonly extraction: ExtractionServices;
  private _emailProcessing: EmailProcessingService | undefined;

  constructor(
    private readonly env: Env,
    db: Database,
  ) {
    const progressPublisher = ExtractionProgressPublisher.fromUrl(env.redisUrl);
    this.emailService = createEmailService(db, { progressPublisher });
    this.attachmentRepo = createAttachmentRepo(db);
    this.failedJobRepo = createFailedJobRepo(db);
    this.userQueryRepo = createUserQueryRepo(db);
    this.extraction = createExtractionServices({
      openRouter: this.env.openRouter,
      classifyModel: this.env.openRouter.classifyModel,
      extractModel: this.env.openRouter.extractModel,
      pipelineDebug: this.env.pipelineDebug,
      paddle: {
        attachmentsRoot: this.env.attachmentsRoot,
        apiMode: this.env.paddleOcr.apiMode,
        apiUrl: this.env.paddleOcr.apiUrl,
        apiToken: this.env.paddleOcr.apiToken,
        timeoutMs: this.env.paddleOcr.timeoutMs,
        pdfTextMinChars: this.env.paddleOcr.pdfTextMinChars,
        model: this.env.paddleOcr.model,
        pollIntervalMs: this.env.paddleOcr.pollIntervalMs,
        jobTimeoutMs: this.env.paddleOcr.jobTimeoutMs,
      },
    });
  }

  get emailProcessing(): EmailProcessingService {
    return (this._emailProcessing ??= new EmailProcessingServiceImpl(
      this.env,
      new LoadEmailStep(this.emailService, this.attachmentRepo, this.userQueryRepo),
      new MarkProcessingStep(this.emailService),
      new ClassifyStep(this.extraction.classify, this.emailService),
      new ClassifyAndExtractStep(this.extraction.classifyAndExtract, this.emailService),
      new PersistSkippedStep(this.emailService),
      new ParseAttachmentsStep(this.extraction.documentParse, this.attachmentRepo),
      new FinalExtractStep(this.extraction.finalExtract),
      new PersistResultStep(this.emailService, db),
      new FailureHandlerStep(this.emailService, this.failedJobRepo, db),
    ));
  }
}

export default ServiceProvider;
