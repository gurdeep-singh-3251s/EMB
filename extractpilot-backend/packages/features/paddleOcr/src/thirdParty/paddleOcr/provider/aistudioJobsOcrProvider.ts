import { PaddleOcrFileType, type PaddleOcrConfig } from "@repo/types/paddleOcr";
import {
  type AiStudioJobPollResponse,
  parseJsonlMarkdownPages,
} from "../../../utils/aistudioJobsResponse";
import { paddleLog } from "../../../shared/log";
import type { IPaddleOcrProvider } from "./iPaddleOcrProvider";

/** AI Studio v2 jobs — aligned with Paddle Python SDK optional_payload for OCR on images. */
const DEFAULT_OPTIONAL_PAYLOAD = {
  markdownIgnoreLabels: ["aside_text"],
  useDocOrientationClassify: false,
  useDocUnwarping: false,
  useLayoutDetection: true,
  useChartRecognition: false,
  useSealRecognition: false,
  useOcrForImageBlock: true,
  mergeTables: true,
  relevelTitles: true,
  layoutShapeMode: "auto",
  promptLabel: "ocr",
  repetitionPenalty: 1,
  temperature: 0,
  topP: 1,
  minPixels: 147384,
  maxPixels: 2822400,
  layoutNms: true,
  restructurePages: true,
} as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultFilename(fileType: PaddleOcrFileType, filename?: string): string {
  if (filename?.trim()) return filename.trim();
  return fileType === PaddleOcrFileType.Pdf ? "document.pdf" : "document.jpg";
}

function guessMime(filename: string, fileType: PaddleOcrFileType): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf" || fileType === PaddleOcrFileType.Pdf) return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

export class AiStudioJobsOcrProvider implements IPaddleOcrProvider {
  private readonly jobsUrl: string;
  private readonly model: string;
  private readonly pollIntervalMs: number;
  private readonly jobTimeoutMs: number;
  private readonly httpTimeoutMs: number;

  constructor(private readonly config: PaddleOcrConfig) {
    this.jobsUrl = config.apiUrl.replace(/\/$/, "");
    this.model = config.model ?? "PaddleOCR-VL-1.6";
    this.pollIntervalMs = config.pollIntervalMs ?? 5000;
    this.jobTimeoutMs = config.jobTimeoutMs ?? 300_000;
    this.httpTimeoutMs = config.timeoutMs ?? 120_000;
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `bearer ${this.config.apiToken}` };
  }

  async layoutParsing(
    buffer: Buffer,
    fileType: PaddleOcrFileType,
    filename?: string,
  ): Promise<string[]> {
    const name = defaultFilename(fileType, filename);
    paddleLog("info", "AI Studio job submit", { filename: name, model: this.model });
    const jobId = await this.submitJob(buffer, name, fileType);
    paddleLog("info", "AI Studio job polling", { jobId });
    const jsonlUrl = await this.pollUntilDone(jobId);
    paddleLog("info", "AI Studio job result ready", { jobId, jsonlUrl: jsonlUrl.slice(0, 80) });
    const jsonlRes = await fetch(jsonlUrl);
    if (!jsonlRes.ok) {
      throw new Error(`Failed to download AI Studio job result: HTTP ${jsonlRes.status}`);
    }
    return parseJsonlMarkdownPages(await jsonlRes.text());
  }

  private async submitJob(buffer: Buffer, filename: string, fileType: PaddleOcrFileType): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.httpTimeoutMs);

    try {
      const form = new FormData();
      form.append("model", this.model);
      form.append("optionalPayload", JSON.stringify(DEFAULT_OPTIONAL_PAYLOAD));
      form.append(
        "file",
        new Blob([buffer], { type: guessMime(filename, fileType) }),
        filename,
      );

      const response = await fetch(this.jobsUrl, {
        method: "POST",
        headers: this.authHeaders(),
        body: form,
        signal: controller.signal,
      });

      const body = (await response.json()) as { data?: { jobId?: string }; message?: string };
      if (!response.ok) {
        throw new Error(body.message ?? `AI Studio job submit failed: HTTP ${response.status}`);
      }

      const jobId = body.data?.jobId;
      if (!jobId) {
        throw new Error("AI Studio job submit did not return jobId");
      }
      return jobId;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async pollUntilDone(jobId: string): Promise<string> {
    const started = Date.now();
    const pollUrl = `${this.jobsUrl}/${jobId}`;

    while (Date.now() - started < this.jobTimeoutMs) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.httpTimeoutMs);

      try {
        const response = await fetch(pollUrl, {
          headers: this.authHeaders(),
          signal: controller.signal,
        });

        const body = (await response.json()) as AiStudioJobPollResponse;
        if (!response.ok) {
          throw new Error(`AI Studio job poll failed: HTTP ${response.status}`);
        }

        const state = body.data?.state;
        paddleLog("info", "AI Studio job status", { jobId, state });
        if (state === "done") {
          const jsonUrl = body.data?.resultUrl?.jsonUrl;
          if (!jsonUrl) {
            throw new Error("AI Studio job done but resultUrl.jsonUrl is missing");
          }
          return jsonUrl;
        }

        if (state === "failed") {
          throw new Error(body.data?.errorMsg ?? "AI Studio OCR job failed");
        }
      } finally {
        clearTimeout(timeout);
      }

      await sleep(this.pollIntervalMs);
    }

    throw new Error(`AI Studio OCR job timed out after ${this.jobTimeoutMs}ms`);
  }
}
