import type { PaddleOcrFileType } from "@repo/types/paddleOcr";

export interface IPaddleOcrProvider {
  layoutParsing(
    buffer: Buffer,
    fileType: PaddleOcrFileType,
    filename?: string,
  ): Promise<string[]>;
}
