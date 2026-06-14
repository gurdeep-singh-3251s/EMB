import { readFile } from "node:fs/promises";
import { basename } from "node:path";

export class DocumentExtractorService {
  async extractText(localPath: string, mimeType: string): Promise<string> {
    const ext = basename(localPath).split(".").pop()?.toLowerCase() ?? "";

    if (mimeType.startsWith("text/") || ext === "txt" || ext === "csv") {
      return readFile(localPath, "utf-8");
    }

    if (mimeType === "application/pdf" || ext === "pdf") {
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const buffer = await readFile(localPath);
        const result = await pdfParse(buffer);
        return result.text ?? "";
      } catch {
        throw new Error("PDF extraction failed");
      }
    }

    if (
      mimeType.includes("wordprocessingml") ||
      ext === "docx"
    ) {
      try {
        const mammoth = await import("mammoth");
        const buffer = await readFile(localPath);
        const result = await mammoth.extractRawText({ buffer });
        return result.value ?? "";
      } catch {
        throw new Error("DOCX extraction failed");
      }
    }

    throw new Error(`Unsupported type: ${mimeType}`);
  }

  isSupported(mimeType: string, filename: string): boolean {
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    return (
      mimeType.startsWith("text/") ||
      ["txt", "csv", "pdf", "docx"].includes(ext) ||
      mimeType === "application/pdf"
    );
  }
}
