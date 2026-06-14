import type { ClassificationResult } from "@repo/types/userQuery";
import type { ParsedEmailResult } from "@repo/types/parsedEmail";
import type { ClassifyEmailInput } from "./iClassificationService";

export type ClassifyAndExtractResult = {
  classification: ClassificationResult;
  /** Set when relevant=true; email fields only (no attachment rows). */
  parsed: ParsedEmailResult | null;
};

export interface IClassifyAndExtractService {
  classifyAndExtract(input: ClassifyEmailInput): Promise<ClassifyAndExtractResult>;
}
