import { DocumentKind } from "@repo/types/paddleOcr";
import type { ILocalDocumentProvider } from "./iLocalDocumentProvider";

class LocalDocumentProvider implements ILocalDocumentProvider {
  async extractText(
    buffer: Buffer,
    kind: DocumentKind.Text | DocumentKind.Docx | DocumentKind.Pdf,
  ): Promise<string> {
    if (kind === DocumentKind.Text) {
      return buffer.toString("utf-8");
    }

    if (kind === DocumentKind.Pdf) {
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(buffer);
      return result.text ?? "";
    }

    if (kind === DocumentKind.Docx) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value ?? "";
    }

    throw new Error(`Local extraction not supported for kind: ${kind}`);
  }
}

export default LocalDocumentProvider;
