export enum PaddleOcrFileType {
  Pdf = 0,
  Image = 1,
}

export enum DocumentKind {
  Text = "text",
  Pdf = "pdf",
  Docx = "docx",
  Image = "image",
}

export enum DocumentParseSource {
  Local = "local",
  PaddleOcr = "paddle-ocr",
}

export type PaddleOcrApiMode = "layout-parsing" | "aistudio-jobs";

export type PaddleOcrConfig = {
  /**
   * - layout-parsing: sync POST with base64 JSON (`Authorization: token …`)
   * - aistudio-jobs: AI Studio v2 async jobs (`Authorization: bearer …`)
   */
  apiMode?: PaddleOcrApiMode;
  /** layout-parsing URL or AI Studio jobs base URL (…/api/v2/ocr/jobs) */
  apiUrl: string;
  apiToken: string;
  /** Per-request timeout (layout-parsing) or HTTP timeout for job submit (ms) */
  timeoutMs?: number;
  /** AI Studio jobs only — e.g. PaddleOCR-VL-1.6 */
  model?: string;
  pollIntervalMs?: number;
  jobTimeoutMs?: number;
};

export type DocumentParserConfig = PaddleOcrConfig & {
  /** Absolute or configured root — used to resolve legacy relative `localPath` values */
  attachmentsRoot?: string;
  /** Min extracted chars before skipping PaddleOCR for PDFs (scanned PDF fallback) */
  pdfTextMinChars?: number;
};

export type ParseDocumentInput = {
  localPath: string;
  filename?: string;
  mimeType?: string;
};

export type ParseDocumentBufferInput = {
  buffer: Uint8Array;
  filename: string;
  mimeType?: string;
};

export type ParsedDocumentPage = {
  pageIndex: number;
  text: string;
  rawMarkdown: string;
};

export type ParsedDocumentResult = {
  filename: string;
  mimeType: string;
  kind: DocumentKind;
  source: DocumentParseSource;
  /** Cleaned plain text (all pages joined) */
  text: string;
  /** Cleaned markdown (all pages joined) */
  markdown: string;
  pages: ParsedDocumentPage[];
  pageCount: number;
};
