import { DTO } from "@repo/dto";
import {
  DocumentKind,
  DocumentParseSource,
  PaddleOcrFileType,
  type ParseDocumentBufferInput,
  type ParseDocumentInput,
  type ParsedDocumentPage,
  type ParsedDocumentResult,
  type PaddleOcrConfig,
} from "@repo/types/paddleOcr";
import type { IDocumentFileRepo } from "../../repo/iDocumentFileRepo";
import type { IPaddleOcrProvider } from "../../thirdParty/paddleOcr/provider/iPaddleOcrProvider";
import { resolveFileType, resolveFilename } from "../../utils/fileType";
import type { IOcrTextCleanerService } from "../../ocrCleaner/service/iOcrTextCleanerService";
import type { IPaddleOcrService } from "./iPaddleOcrService";

class PaddleOcrService implements IPaddleOcrService {
  constructor(
    private readonly config: PaddleOcrConfig,
    private readonly cleaner: IOcrTextCleanerService,
    private readonly paddleOcrProvider: IPaddleOcrProvider,
    private readonly documentFileRepo: IDocumentFileRepo,
  ) {}

  async parseFile(input: ParseDocumentInput): Promise<DTO<ParsedDocumentResult>> {
    try {
      const filename = resolveFilename(input.localPath, input.filename);
      const fileType = resolveFileType(filename, input.mimeType);
      if (fileType === null) {
        return DTO.HandledError(`Unsupported file type for PaddleOCR: ${filename}`, null);
      }

      const buffer = await this.documentFileRepo.read(input.localPath);
      return this.parseBuffer({
        buffer,
        filename,
        mimeType: input.mimeType,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to read file for PaddleOCR";
      return DTO.UnhandledError(message, e);
    }
  }

  async parseBuffer(input: ParseDocumentBufferInput): Promise<DTO<ParsedDocumentResult>> {
    try {
      if (!this.config.apiUrl.trim()) {
        return DTO.HandledError("PaddleOCR apiUrl is not configured", null);
      }
      if (!this.config.apiToken.trim()) {
        return DTO.HandledError("PaddleOCR apiToken is not configured", null);
      }

      const fileType = resolveFileType(input.filename, input.mimeType);
      if (fileType === null) {
        return DTO.HandledError(`Unsupported file type for PaddleOCR: ${input.filename}`, null);
      }

      const rawPages = await this.paddleOcrProvider.layoutParsing(
        Buffer.from(input.buffer),
        fileType,
        input.filename,
      );
      const pages: ParsedDocumentPage[] = rawPages.map((rawMarkdown, pageIndex) => {
        const cleanedMarkdown = this.cleaner.cleanMarkdown(rawMarkdown);
        const cleanedText = this.cleaner.cleanPlainText(rawMarkdown);
        return {
          pageIndex,
          text: cleanedText,
          rawMarkdown: cleanedMarkdown,
        };
      });

      const markdown = pages.map((page) => page.rawMarkdown).join("\n\n---\n\n");
      const text = pages.map((page) => page.text).join("\n\n");

      if (!text.trim()) {
        return DTO.HandledError("PaddleOCR returned no readable text after cleaning", null);
      }

      return DTO.Success({
        filename: input.filename,
        mimeType: input.mimeType ?? "application/octet-stream",
        kind: fileType === PaddleOcrFileType.Pdf ? DocumentKind.Pdf : DocumentKind.Image,
        source: DocumentParseSource.PaddleOcr,
        text,
        markdown,
        pages,
        pageCount: pages.length,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "PaddleOCR parsing failed";
      return DTO.UnhandledError(message, e);
    }
  }
}

export default PaddleOcrService;
