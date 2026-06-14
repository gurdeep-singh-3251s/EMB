import { createIngestionServices, type ImapAccountConfig } from "@repo/feature-ingestion";
import type { EmailJobPayload } from "@repo/types/email";
import type { MailProvider } from "./MailProvider";

export class ImapMailProvider implements MailProvider {
  constructor(
    private readonly account: ImapAccountConfig,
    private readonly options: { sinceHours: number; unreadOnly: boolean; markSeenOnSuccess: boolean },
    private readonly config: {
      attachmentsRoot: string;
      maxAttachmentSizeMb: number;
      maxAttachmentsPerEmail: number;
    },
  ) {}

  async fetchRecent(): Promise<EmailJobPayload[]> {
    const { imapIngestion } = createIngestionServices({
      attachmentsRoot: this.config.attachmentsRoot,
      maxAttachmentSizeMb: this.config.maxAttachmentSizeMb,
      maxAttachmentsPerEmail: this.config.maxAttachmentsPerEmail,
    });

    return imapIngestion.fetchRecent(this.account, {
      sinceHours: this.options.sinceHours,
      unreadOnly: this.options.unreadOnly,
      markSeenOnSuccess: this.options.markSeenOnSuccess,
    });
  }
}
