import type { DTO } from "@repo/dto";
import type {
  ParseDocumentBufferInput,
  ParseDocumentInput,
  ParsedDocumentResult,
} from "@repo/types/paddleOcr";

export interface IPaddleOcrService {
  parseFile(input: ParseDocumentInput): Promise<DTO<ParsedDocumentResult>>;
  parseBuffer(input: ParseDocumentBufferInput): Promise<DTO<ParsedDocumentResult>>;
}
