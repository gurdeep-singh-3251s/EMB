import { DTO } from "@repo/dto";
import {
  DocumentKind,
  DocumentParseSource,
  type DocumentParserConfig,
  type ParseDocumentBufferInput,
  type ParseDocumentInput,
  type ParsedDocumentPage,
  type ParsedDocumentResult,
} from "@repo/types/paddleOcr";
import type { ILocalDocumentProvider } from "../../providers/localDocument/iLocalDocumentProvider";
import type { IDocumentFileRepo } from "../../repo/iDocumentFileRepo";
import { resolveDocumentKind, resolveFilename } from "../../utils/fileType";
import type { IOcrTextCleanerService } from "../../ocrCleaner/service/iOcrTextCleanerService";
import type { IPaddleOcrService } from "../../paddleOcr/service/iPaddleOcrService";
import { paddleLog } from "../../shared/log";
import type { IDocumentParserService } from "./iDocumentParserService";

class DocumentParserService implements IDocumentParserService {
  private readonly pdfTextMinChars: number;

  constructor(
    private readonly paddleOcr: IPaddleOcrService,
    config: DocumentParserConfig,
    private readonly cleaner: IOcrTextCleanerService,
    private readonly localDocumentProvider: ILocalDocumentProvider,
    private readonly documentFileRepo: IDocumentFileRepo,
  ) {
    this.pdfTextMinChars = config.pdfTextMinChars ?? 32;
  }

  async parseFile(input: ParseDocumentInput): Promise<DTO<ParsedDocumentResult>> {
    try {
      const filename = resolveFilename(input.localPath, input.filename);
      const kind = resolveDocumentKind(filename, input.mimeType);
      if (kind === null) {
        return DTO.HandledError(`Unsupported document type: ${filename}`, null);
      }

      const buffer = await this.documentFileRepo.read(input.localPath);
      return this.parseBuffer({
        buffer,
        filename,
        mimeType: input.mimeType,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to read document";
      return DTO.UnhandledError(message, e);
    }
  }

  async parseBuffer(input: ParseDocumentBufferInput): Promise<DTO<ParsedDocumentResult>> {
    try {
      const kind = resolveDocumentKind(input.filename, input.mimeType);
      if (kind === null) {
        return DTO.HandledError(`Unsupported document type: ${input.filename}`, null);
      }

      if (kind === DocumentKind.Image) {
        paddleLog("info", "route → AI Studio / Paddle OCR (image)", { filename: input.filename });
        return this.parseWithPaddleOcr(input, kind);
      }

      if (kind === DocumentKind.Pdf) {
        paddleLog("info", "route → PDF (local text first, then OCR if scanned)", {
          filename: input.filename,
          pdfTextMinChars: this.pdfTextMinChars,
        });
        return this.parsePdf(input);
      }

      paddleLog("info", "route → local extract", { filename: input.filename, kind });
      return this.parseLocal(input, kind);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Document parsing failed";
      return DTO.UnhandledError(message, e);
    }
  }

  private async parseLocal(
    input: ParseDocumentBufferInput,
    kind: DocumentKind.Text | DocumentKind.Docx,
  ): Promise<DTO<ParsedDocumentResult>> {
    const rawText = await this.localDocumentProvider.extractText(Buffer.from(input.buffer), kind);
    return this.buildLocalResult(input, kind, rawText);
  }

  private async parsePdf(input: ParseDocumentBufferInput): Promise<DTO<ParsedDocumentResult>> {
    try {
      const rawText = await this.localDocumentProvider.extractText(
        Buffer.from(input.buffer),
        DocumentKind.Pdf,
      );
      if (rawText.trim().length >= this.pdfTextMinChars) {
        paddleLog("info", "PDF local text sufficient", {
          filename: input.filename,
          chars: rawText.trim().length,
        });
        return this.buildLocalResult(input, DocumentKind.Pdf, rawText);
      }
      paddleLog("info", "PDF local text too short — falling back to OCR", {
        filename: input.filename,
        chars: rawText.trim().length,
      });
    } catch {
      paddleLog("info", "PDF local extract failed — falling back to OCR", {
        filename: input.filename,
      });
    }

    return this.parseWithPaddleOcr(input, DocumentKind.Pdf);
  }

  private async parseWithPaddleOcr(
    input: ParseDocumentBufferInput,
    kind: DocumentKind.Pdf | DocumentKind.Image,
  ): Promise<DTO<ParsedDocumentResult>> {
    const ocrResult = await this.paddleOcr.parseBuffer(input);
    if (!ocrResult.success) {
      return ocrResult;
    }

    return DTO.Success({
      ...ocrResult.data,
      kind,
      source: DocumentParseSource.PaddleOcr,
    });
  }

  private buildLocalResult(
    input: ParseDocumentBufferInput,
    kind: DocumentKind,
    rawText: string,
  ): DTO<ParsedDocumentResult> {
    const cleanedMarkdown = this.cleaner.cleanMarkdown(rawText);
    const cleanedText = this.cleaner.cleanPlainText(rawText);

    if (!cleanedText.trim()) {
      return DTO.HandledError("Document has no readable text after extraction", null);
    }

    const page: ParsedDocumentPage = {
      pageIndex: 0,
      text: cleanedText,
      rawMarkdown: cleanedMarkdown,
    };

    return DTO.Success({
      filename: input.filename,
      mimeType: input.mimeType ?? "application/octet-stream",
      kind,
      source: DocumentParseSource.Local,
      text: cleanedText,
      markdown: cleanedMarkdown,
      pages: [page],
      pageCount: 1,
    });
  }
}

export default DocumentParserService;
