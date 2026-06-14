import type { Database } from "@repo/db";
import type { IAttachmentRepo } from "./repo/iAttachmentRepo";
import { AttachmentRepo } from "./repo/attachmentRepo";
import type { IAttachmentService } from "./service/iAttachmentService";
import { AttachmentService } from "./service/attachmentService";

export function createAttachmentRepo(db: Database): IAttachmentRepo {
  return new AttachmentRepo({ db });
}

export function createAttachmentService(db: Database): IAttachmentService {
  return new AttachmentService({ repo: createAttachmentRepo(db) });
}
