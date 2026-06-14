import type { DTO } from "@repo/dto";
import type { EmailAttachmentRow, IAttachmentRepo } from "../repo/iAttachmentRepo";

export interface IAttachmentService {
  byEmailId(emailId: string): Promise<DTO<EmailAttachmentRow[]>>;
  byId(id: string): Promise<DTO<EmailAttachmentRow | null>>;
}

export type AttachmentServiceDeps = { repo: IAttachmentRepo };
