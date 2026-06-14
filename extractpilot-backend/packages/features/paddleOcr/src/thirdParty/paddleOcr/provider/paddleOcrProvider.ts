import type { PaddleOcrConfig, PaddleOcrFileType } from "@repo/types/paddleOcr";
import { assertSuccessResponse, extractPagesFromResponse, type LayoutParsingResponse } from "../../../utils/responseParser";
import type { IPaddleOcrProvider } from "./iPaddleOcrProvider";

class PaddleOcrProvider implements IPaddleOcrProvider {
  private readonly timeoutMs: number;

  constructor(private readonly config: PaddleOcrConfig) {
    this.timeoutMs = config.timeoutMs ?? 120_000;
  }

  async layoutParsing(
    buffer: Buffer,
    fileType: PaddleOcrFileType,
    _filename?: string,
  ): Promise<string[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.config.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `token ${this.config.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file: buffer.toString("base64"),
          fileType,
          prettifyMarkdown: true,
          visualize: false,
        }),
        signal: controller.signal,
      });

      const body = (await response.json()) as LayoutParsingResponse;
      assertSuccessResponse(body, response.status);
      return extractPagesFromResponse(body);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export default PaddleOcrProvider;
