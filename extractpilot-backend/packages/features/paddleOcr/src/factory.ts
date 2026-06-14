import type { DocumentParserConfig, PaddleOcrConfig } from "@repo/types/paddleOcr";
import type { IDocumentParserService } from "./documentParser/service/iDocumentParserService";
import type { IOcrTextCleanerService } from "./ocrCleaner/service/iOcrTextCleanerService";
import type { IPaddleOcrService } from "./paddleOcr/service/iPaddleOcrService";
import type { ILocalDocumentProvider } from "./providers/localDocument/iLocalDocumentProvider";
import type { IDocumentFileRepo } from "./repo/iDocumentFileRepo";
import type { IPaddleOcrProvider } from "./thirdParty/paddleOcr/provider/iPaddleOcrProvider";
import ServiceProvider from "./serviceProvider";

export function createPaddleOcrService(config: PaddleOcrConfig): IPaddleOcrService {
  return new ServiceProvider(config).paddleOcr;
}

export function createDocumentParserService(config: DocumentParserConfig): IDocumentParserService {
  return new ServiceProvider(config).documentParser;
}

export { ServiceProvider };
export type {
  IDocumentParserService,
  IOcrTextCleanerService,
  IPaddleOcrService,
  ILocalDocumentProvider,
  IDocumentFileRepo,
  IPaddleOcrProvider,
};
