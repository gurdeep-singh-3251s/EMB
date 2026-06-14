import type { EmailAttachment, EmailProvider } from "@repo/types/email";

export interface IAttachmentStorageService {
  saveAll(
    provider: EmailProvider,
    messageId: string,
    files: Array<{ filename: string; mimeType: string; content: Buffer }>,
  ): Promise<EmailAttachment[]>;
}
