import type { ClassificationResult } from "@repo/types/userQuery";
import type { UserQueryRow } from "@repo/types/userQuery";

export interface ClassifyEmailAttachmentHint {
  filename: string;
  mimeType: string;
}

export interface ClassifyEmailInput {
  userQuery: UserQueryRow;
  subject: string;
  sender: string;
  rawContent: string;
  /** Filenames/types only — OCR runs after classify; used as relevance hints. */
  attachments: ClassifyEmailAttachmentHint[];
}

export interface IClassificationService {
  classify(input: ClassifyEmailInput): Promise<ClassificationResult>;
}
