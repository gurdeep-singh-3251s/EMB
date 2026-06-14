import { basename } from "node:path";
import { DocumentKind, PaddleOcrFileType } from "@repo/types/paddleOcr";

const TEXT_EXTENSIONS = new Set(["txt", "csv", "md", "json", "xml", "html", "htm", "log"]);
const PDF_EXTENSIONS = new Set(["pdf"]);
const PDF_MIMES = new Set(["application/pdf"]);
const DOCX_EXTENSIONS = new Set(["docx"]);
const DOCX_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "tif", "tiff"]);
const IMAGE_MIME_PREFIXES = ["image/"];

export function resolveFilename(localPath: string, filename?: string): string {
  return filename ?? basename(localPath);
}

export function extensionOf(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export function resolveDocumentKind(filename: string, mimeType?: string): DocumentKind | null {
  const ext = extensionOf(filename);
  const mime = mimeType?.toLowerCase() ?? "";

  if (mime.startsWith("text/") || TEXT_EXTENSIONS.has(ext)) {
    return DocumentKind.Text;
  }

  if (PDF_EXTENSIONS.has(ext) || PDF_MIMES.has(mime)) {
    return DocumentKind.Pdf;
  }

  if (DOCX_EXTENSIONS.has(ext) || DOCX_MIMES.has(mime) || mime.includes("wordprocessingml")) {
    return DocumentKind.Docx;
  }

  if (IMAGE_EXTENSIONS.has(ext) || IMAGE_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))) {
    return DocumentKind.Image;
  }

  return null;
}

export function resolvePaddleOcrFileType(kind: DocumentKind): PaddleOcrFileType | null {
  if (kind === DocumentKind.Pdf) return PaddleOcrFileType.Pdf;
  if (kind === DocumentKind.Image) return PaddleOcrFileType.Image;
  return null;
}

export function isDocumentSupported(filename: string, mimeType?: string): boolean {
  return resolveDocumentKind(filename, mimeType) !== null;
}

/** @deprecated Use isDocumentSupported */
export function isPaddleOcrSupported(filename: string, mimeType?: string): boolean {
  const kind = resolveDocumentKind(filename, mimeType);
  return kind === DocumentKind.Pdf || kind === DocumentKind.Image;
}

export function resolveFileType(filename: string, mimeType?: string): PaddleOcrFileType | null {
  const kind = resolveDocumentKind(filename, mimeType);
  return kind ? resolvePaddleOcrFileType(kind) : null;
}
