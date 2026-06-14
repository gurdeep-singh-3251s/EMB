import type { IAttachmentRepo } from "@repo/feature-attachment";
import type { IDocumentParseService } from "@repo/feature-extraction";
import { DTO } from "@repo/dto";
import type { ProcessingContext } from "@repo/types/workerProcessing";
import { logPipeline, traceMeta } from "../pipelineLog";
import type {
  ErrorMeta,
  ParseAttachmentSummary,
  ParseAttachmentsDoneMeta,
  ParseAttachmentsSkipMeta,
} from "../pipelineLogTypes";
import type { IParseAttachmentsProvider } from "../iProcessingProviders";

export class ParseAttachmentsStep implements IParseAttachmentsProvider {
  constructor(
    private readonly documentParse: IDocumentParseService,
    private readonly attachmentRepo: IAttachmentRepo,
  ) {}

  async run(ctx: ProcessingContext): Promise<DTO<ProcessingContext>> {
    if (ctx.attachmentRows.length === 0) {
      const skipMeta: ParseAttachmentsSkipMeta = { ...traceMeta(ctx), reason: "no-attachments" };
      logPipeline("4-parse-attachments", "skip", skipMeta);
      return DTO.Success(ctx);
    }

    logPipeline("4-parse-attachments", "start", traceMeta(ctx));
    try {
      const parsed = await this.documentParse.parseAttachments(ctx.attachmentRows);

      let saved = 0;
      for (const row of parsed) {
        if (row.extractedText && row.extractSource) {
          await this.attachmentRepo.saveExtractedText(row.id, {
            extractedText: row.extractedText,
            extractSource: row.extractSource,
            processingStatus: "completed",
          });
          saved += 1;
        }
      }

      const parsedSummaries: ParseAttachmentSummary[] = parsed.map((a) => ({
        filename: a.filename,
        source: a.extractSource ?? "none",
        textLength: a.extractedText?.length ?? 0,
      }));
      const doneMeta: ParseAttachmentsDoneMeta = {
        ...traceMeta(ctx),
        parsed: parsedSummaries,
        savedToDb: saved,
      };
      logPipeline("4-parse-attachments", "done", doneMeta);

      const nextCtx: ProcessingContext = { ...ctx, attachmentRows: parsed };
      return DTO.Success(nextCtx);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Parse attachments failed";
      const errorMeta: ErrorMeta = { ...traceMeta(ctx), message };
      logPipeline("4-parse-attachments", "error", errorMeta);
      return DTO.UnhandledError(message, e);
    }
  }
}
