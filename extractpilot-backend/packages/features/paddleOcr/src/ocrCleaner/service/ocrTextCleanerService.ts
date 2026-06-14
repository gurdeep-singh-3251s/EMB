import type { IOcrTextCleanerService } from "./iOcrTextCleanerService";

class OcrTextCleanerService implements IOcrTextCleanerService {
  cleanMarkdown(raw: string): string {
    let text = raw.normalize("NFKC");

    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    text = text.replace(/[\u200B-\u200D\uFEFF]/g, "");
    text = text.replace(/[ \t]+\n/g, "\n");
    text = text.replace(/\n{3,}/g, "\n\n");
    text = text.replace(/[ \t]{2,}/g, " ");
    text = text.replace(/!\[[^\]]*]\([^)]*\)/g, "");
    text = text.replace(/\[([^\]]+)]\([^)]*\)/g, "$1");
    text = text.replace(/^#{1,6}\s+/gm, "");
    text = text.replace(/^\s*[-*+]\s+/gm, "- ");
    text = text.replace(/^\s*\d+\.\s+/gm, (match) => match.trimStart());

    return text.trim();
  }

  cleanPlainText(raw: string): string {
    let text = this.cleanMarkdown(raw);

    text = text.replace(/[|]{2,}/g, " ");
    text = text.replace(/(\w)-\n(\w)/g, "$1$2");
    text = text.replace(/([a-z])([A-Z])/g, "$1 $2");
    text = text.replace(/[^\S\n]+/g, " ");
    text = text.replace(/\n{3,}/g, "\n\n");

    return text.trim();
  }
}

export default OcrTextCleanerService;
