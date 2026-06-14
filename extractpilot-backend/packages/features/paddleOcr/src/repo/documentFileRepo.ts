import { readFile } from "node:fs/promises";
import { resolveAttachmentLocalPath } from "@repo/config/paths";
import type { IDocumentFileRepo } from "./iDocumentFileRepo";

class DocumentFileRepo implements IDocumentFileRepo {
  constructor(private readonly attachmentsRoot: string) {}

  async read(localPath: string): Promise<Buffer> {
    const resolved = resolveAttachmentLocalPath(localPath, this.attachmentsRoot);
    return readFile(resolved);
  }
}

export default DocumentFileRepo;
