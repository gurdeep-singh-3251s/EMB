export interface IOcrTextCleanerService {
  cleanMarkdown(raw: string): string;
  cleanPlainText(raw: string): string;
}
