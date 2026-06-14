import type { DocumentKind } from "@repo/types/paddleOcr";

export interface ILocalDocumentProvider {
  extractText(
    buffer: Buffer,
    kind: DocumentKind.Text | DocumentKind.Docx | DocumentKind.Pdf,
  ): Promise<string>;
}
