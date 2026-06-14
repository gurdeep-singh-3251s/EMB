import type { DocumentParserConfig } from "@repo/types/paddleOcr";
import DocumentParserService from "./documentParser/service/documentParserService";
import type { IDocumentParserService } from "./documentParser/service/iDocumentParserService";
import OcrTextCleanerService from "./ocrCleaner/service/ocrTextCleanerService";
import type { IOcrTextCleanerService } from "./ocrCleaner/service/iOcrTextCleanerService";
import PaddleOcrService from "./paddleOcr/service/paddleOcrService";
import type { IPaddleOcrService } from "./paddleOcr/service/iPaddleOcrService";
import LocalDocumentProvider from "./providers/localDocument/localDocumentProvider";
import type { ILocalDocumentProvider } from "./providers/localDocument/iLocalDocumentProvider";
import DocumentFileRepo from "./repo/documentFileRepo";
import type { IDocumentFileRepo } from "./repo/iDocumentFileRepo";
import { createPaddleOcrProvider } from "./thirdParty/paddleOcr/provider/createPaddleOcrProvider";
import type { IPaddleOcrProvider } from "./thirdParty/paddleOcr/provider/iPaddleOcrProvider";

class ServiceProvider {
  private readonly documentFileRepo: IDocumentFileRepo;
  private readonly ocrCleaner: IOcrTextCleanerService;
  private readonly localDocumentProvider: ILocalDocumentProvider;
  private readonly paddleOcrProvider: IPaddleOcrProvider;
  private _paddleOcr: IPaddleOcrService | undefined;
  private _documentParser: IDocumentParserService | undefined;

  constructor(private readonly config: DocumentParserConfig) {
    this.documentFileRepo = new DocumentFileRepo(config.attachmentsRoot ?? "");
    this.ocrCleaner = new OcrTextCleanerService();
    this.localDocumentProvider = new LocalDocumentProvider();
    this.paddleOcrProvider = createPaddleOcrProvider(config);
  }

  get paddleOcr(): IPaddleOcrService {
    return (this._paddleOcr ??= new PaddleOcrService(
      this.config,
      this.ocrCleaner,
      this.paddleOcrProvider,
      this.documentFileRepo,
    ));
  }

  get documentParser(): IDocumentParserService {
    return (this._documentParser ??= new DocumentParserService(
      this.paddleOcr,
      this.config,
      this.ocrCleaner,
      this.localDocumentProvider,
      this.documentFileRepo,
    ));
  }
}

export default ServiceProvider;
