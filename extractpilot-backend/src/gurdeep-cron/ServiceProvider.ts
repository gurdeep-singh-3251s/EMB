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
  private readonly emailService: ReturnType<typeof createEmailService>;
  private readonly attachmentRepo: IAttachmentRepo;
  private readonly userQueryRepo: IUserQueryRepo;
  private readonly progressPublisher: ExtractionProgressPublisher;
  private _email: EmailService | undefined;

  constructor(
    private readonly env: Env,
    private readonly queue: ReturnType<typeof createEmailProcessingQueue>,
    progressPublisher: ExtractionProgressPublisher,
  ) {
    const db = createDb(env.databaseUrl);
    this.progressPublisher = progressPublisher;
    this.emailService = createEmailService(db, { progressPublisher });
    this.attachmentRepo = createAttachmentRepo(db);
    this.userQueryRepo = createUserQueryRepo(db);
  }

  get emails(): EmailService {
    return (this._email ??= new EmailServiceImpl(
      this.env,
      this.queue,
      this.emailService,
      this.attachmentRepo,
      this.userQueryRepo,
    ));
  }
}

export default ServiceProvider;
