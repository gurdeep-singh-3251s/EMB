import { createDocumentParserService } from "@repo/feature-paddle-ocr";
import type { DocumentParserConfig } from "@repo/types/paddleOcr";
import type { WorkerAttachmentRow } from "@repo/types/workerProcessing";
import type { IDocumentParseService } from "./iDocumentParseService";

function logAttach(message: string, meta?: Record<string, unknown>): void {
  const line = meta ? `${message} ${JSON.stringify(meta)}` : message;
  console.log(`[attachments]`, line);
}

export class DocumentParseService implements IDocumentParseService {
  private readonly parser;

  constructor(
    paddleConfig: DocumentParserConfig,
    private readonly pipelineDebug = false,
  ) {
    this.parser = createDocumentParserService(paddleConfig);
  }

  async parseAttachments(rows: WorkerAttachmentRow[]): Promise<WorkerAttachmentRow[]> {
    logAttach("parse batch start", { count: rows.length });

    const out: WorkerAttachmentRow[] = [];

    for (const row of rows) {
      if (row.extractedText) {
        logAttach("skip already extracted", {
          filename: row.filename,
          source: row.extractSource,
          textLength: row.extractedText.length,
        });
        out.push(row);
        continue;
      }

      logAttach("parsing file", {
        filename: row.filename,
        mimeType: row.mimeType,
        localPath: row.localPath,
      });

      const started = Date.now();
      const res = await this.parser.parseFile({
        localPath: row.localPath,
        filename: row.filename,
        mimeType: row.mimeType,
      });

      if (!res.success) {
        logAttach("parse failed", {
          filename: row.filename,
          message: res.message,
          ms: Date.now() - started,
        });
        out.push({
          ...row,
          extractedText: null,
          extractSource: null,
        });
        continue;
      }

      logAttach("parse ok", {
        filename: row.filename,
        source: res.data.source,
        kind: res.data.kind,
        textLength: res.data.text.length,
        pageCount: res.data.pageCount,
        ms: Date.now() - started,
      });

      if (this.pipelineDebug && res.data.text) {
        const preview = res.data.text.slice(0, 300);
        logAttach("text preview", { filename: row.filename, preview });
      }

      out.push({
        ...row,
        extractedText: res.data.text,
        extractSource: res.data.source,
      });
    }

    logAttach("parse batch done", {
      total: out.length,
      withText: out.filter((r) => r.extractedText).length,
    });

    return out;
  }
}
