import type { UserQueryRow } from "@repo/types/userQuery";
import type { ParsedEmailResult } from "@repo/types/parsedEmail";
import type { WorkerAttachmentRow } from "@repo/types/workerProcessing";

export interface FinalExtractInput {
  userQuery: UserQueryRow;
  subject: string;
  sender: string;
  rawContent: string;
  attachmentRows: WorkerAttachmentRow[];
  ownerUserId?: string | null;
}

export interface IFinalExtractionService {
  extract(input: FinalExtractInput): Promise<ParsedEmailResult>;
}
