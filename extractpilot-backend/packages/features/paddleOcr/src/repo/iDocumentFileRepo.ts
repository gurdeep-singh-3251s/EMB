export interface IDocumentFileRepo {
  read(localPath: string): Promise<Buffer>;
}
