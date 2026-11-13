import { createDb } from "@repo/db";
import type { Env } from "@repo/config";
import { createAttachmentRepo, type IAttachmentRepo } from "@repo/feature-attachment";
import { createEmailService } from "@repo/feature-email";
import { createUserQueryRepo, type IUserQueryRepo } from "@repo/feature-user-query";
import { ExtractionProgressPublisher } from "@repo/feature-queue";
import type { EmailService } from "./email-provider/service/EmailService";
import EmailServiceImpl from "./email-provider/service/EmailServiceImpl";
import type { createEmailProcessingQueue } from "./email-provider/provider/emailQueueProvider";

class ServiceProvider {
  private readonly db: ReturnType<typeof createDb>;
  private readonly progressPublisher: ExtractionProgressPublisher;
  private _email: EmailService | undefined;

  constructor(
    private readonly env: Env,
    private readonly queue: ReturnType<typeof createEmailProcessingQueue>,
    progressPublisher: ExtractionProgressPublisher,
  ) {
    this.db = createDb(env.databaseUrl);
    this.progressPublisher = progressPublisher;
  }

  runnerForUser(ownerUserId: string): EmailService {
    const emailService = createEmailService(this.db, {
      ownerUserId,
      progressPublisher: this.progressPublisher,
    });
    const attachmentRepo = createAttachmentRepo(this.db);
    const userQueryRepo = createUserQueryRepo(this.db, { ownerUserId });
    return new EmailServiceImpl(this.env, this.queue, emailService, attachmentRepo, userQueryRepo);
  }

  /** @deprecated Use runnerForUser(tenantId) for SaaS requests */
  get emails(): EmailService {
    const emailService = createEmailService(this.db, { progressPublisher: this.progressPublisher });
    const attachmentRepo = createAttachmentRepo(this.db);
    const userQueryRepo = createUserQueryRepo(this.db);
    return (this._email ??= new EmailServiceImpl(
      this.env,
      this.queue,
      emailService,
      attachmentRepo,
      userQueryRepo,
    ));
  }
}

export default ServiceProvider;
