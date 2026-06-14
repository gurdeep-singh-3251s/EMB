import { DTO } from "@repo/dto";
import type { EmailAttachmentRow } from "../repo/iAttachmentRepo";
import type { AttachmentServiceDeps, IAttachmentService } from "./iAttachmentService";

export class AttachmentService implements IAttachmentService {
  constructor(private readonly deps: AttachmentServiceDeps) {}

  async byEmailId(emailId: string): Promise<DTO<EmailAttachmentRow[]>> {
    return DTO.Success(await this.deps.repo.byEmailId(emailId));
  }

  async byId(id: string): Promise<DTO<EmailAttachmentRow | null>> {
    return DTO.Success(await this.deps.repo.byId(id));
  }
}
