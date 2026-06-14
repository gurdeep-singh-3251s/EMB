import type { WorkerAttachmentRow } from "@repo/types/workerProcessing";

export interface IDocumentParseService {
  parseAttachments(rows: WorkerAttachmentRow[]): Promise<WorkerAttachmentRow[]>;
}
