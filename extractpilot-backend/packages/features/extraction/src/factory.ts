import type { DocumentParserConfig } from "@repo/types/paddleOcr";
import type { OpenRouterConfig } from "./service/openrouterService";
import { ClassifyAndExtractService } from "./service/classifyAndExtractService";
import { ClassificationService } from "./service/classificationService";
import { DocumentParseService } from "./service/documentParseService";
import { FinalExtractionService } from "./service/finalExtractionService";
import { OpenRouterService } from "./service/openrouterService";
import type { IClassifyAndExtractService } from "./service/iClassifyAndExtractService";
import type { IClassificationService } from "./service/iClassificationService";
import type { IDocumentParseService } from "./service/iDocumentParseService";
import type { IFinalExtractionService } from "./service/iFinalExtractionService";

export type ExtractionServicesConfig = {
  openRouter: OpenRouterConfig;
  classifyModel: string;
  extractModel: string;
  paddle: DocumentParserConfig;
  pipelineDebug?: boolean;
};

export type ExtractionServices = {
  classify: IClassificationService;
  classifyAndExtract: IClassifyAndExtractService;
  documentParse: IDocumentParseService;
  finalExtract: IFinalExtractionService;
};

export function createExtractionServices(config: ExtractionServicesConfig): ExtractionServices {
  const openRouter = new OpenRouterService(config.openRouter);
  return {
    classify: new ClassificationService(openRouter, config.classifyModel),
    classifyAndExtract: new ClassifyAndExtractService(openRouter, config.extractModel),
    documentParse: new DocumentParseService(config.paddle, config.pipelineDebug),
    finalExtract: new FinalExtractionService(openRouter, config.extractModel),
  };
}
