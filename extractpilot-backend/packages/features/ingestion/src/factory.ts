import type { IAttachmentStorageService } from "./service/iAttachmentStorageService";
import type { IImapIngestionService } from "./service/iImapIngestionService";
import { AttachmentStorageService } from "./service/attachmentStorageService";
import { ImapIngestionService } from "./service/imapIngestionService";

export function createIngestionServices(config: {
  attachmentsRoot: string;
  maxAttachmentSizeMb: number;
  maxAttachmentsPerEmail: number;
}): {
  attachmentStorage: IAttachmentStorageService;
  imapIngestion: IImapIngestionService;
} {
  const attachmentStorage: IAttachmentStorageService = new AttachmentStorageService(
    config.attachmentsRoot,
    config.maxAttachmentSizeMb,
    config.maxAttachmentsPerEmail,
  );
  const imapIngestion: IImapIngestionService = new ImapIngestionService(attachmentStorage);
  return { attachmentStorage, imapIngestion };
}
