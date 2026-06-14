import type { IAttachmentRepo } from "@repo/feature-attachment";
import type { IEmailService } from "@repo/feature-email";
import type { IUserQueryRepo } from "@repo/feature-user-query";
import { DTO } from "@repo/dto";
import type { LoadEmailInput, ProcessingContext } from "@repo/types/workerProcessing";
import { buildProcessingContext } from "../contextMappers";
import { logPipeline } from "../pipelineLog";
import type {
  LoadEmailAttachmentSummary,
  LoadEmailDoneMeta,
  LoadEmailErrorMeta,
  LoadEmailStartMeta,
} from "../pipelineLogTypes";
import type { ILoadEmailProvider } from "../iProcessingProviders";

export class LoadEmailStep implements ILoadEmailProvider {
  constructor(
    private readonly emailService: IEmailService,
    private readonly attachmentRepo: IAttachmentRepo,
    private readonly userQueryRepo: IUserQueryRepo,
  ) {}

  async run(input: LoadEmailInput): Promise<DTO<ProcessingContext>> {
    const startMeta: LoadEmailStartMeta = { emailUuid: input.emailUuid };
    logPipeline("1-load-email", "start", startMeta);
    try {
      const rowRes = await this.emailService.byIdRaw(input.emailUuid);
      if (!rowRes.success) {
        return DTO.HandledError(rowRes.message, rowRes.error);
      }

      const emailRow = rowRes.data;
      if (!emailRow) {
        return DTO.HandledError(`Email not found in DB for id=${input.emailUuid}`, null);
      }

      const attachmentRows = await this.attachmentRepo.byEmailId(input.emailUuid);

      let userQuery = null;
      if (emailRow.userQueryId) {
        userQuery = await this.userQueryRepo.byId(emailRow.userQueryId);
      }

      const ctx = buildProcessingContext(input, emailRow, attachmentRows, userQuery);

      const attachmentSummaries: LoadEmailAttachmentSummary[] = ctx.attachmentRows.map((a) => ({
        filename: a.filename,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
      }));
      const doneMeta: LoadEmailDoneMeta = {
        emailUuid: ctx.emailUuid,
        subject: ctx.emailRow.subject,
        attachments: attachmentSummaries,
        userQueryId: userQuery?.id ?? null,
      };
      logPipeline("1-load-email", "done", doneMeta);
      return DTO.Success(ctx);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Load email failed";
      const errorMeta: LoadEmailErrorMeta = { message };
      logPipeline("1-load-email", "error", errorMeta);
      return DTO.UnhandledError(message, e);
    }
  }
}
