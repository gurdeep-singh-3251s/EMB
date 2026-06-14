export {
  createDocumentParserService,
  createPaddleOcrService,
  ServiceProvider,
} from "./factory";
export type {
  IDocumentParserService,
  IOcrTextCleanerService,
  IPaddleOcrService,
  ILocalDocumentProvider,
  IDocumentFileRepo,
  IPaddleOcrProvider,
} from "./factory";
export { isDocumentSupported, isPaddleOcrSupported } from "./utils/fileType";
export type {
  DocumentKind,
  DocumentParseSource,
  DocumentParserConfig,
  ParseDocumentBufferInput,
  ParseDocumentInput,
  ParsedDocumentPage,
  ParsedDocumentResult,
  PaddleOcrConfig,
  PaddleOcrFileType,
} from "@repo/types/paddleOcr";
