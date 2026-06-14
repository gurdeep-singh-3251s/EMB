import type { PaddleOcrConfig } from "@repo/types/paddleOcr";
import { AiStudioJobsOcrProvider } from "./aistudioJobsOcrProvider";
import type { IPaddleOcrProvider } from "./iPaddleOcrProvider";
import PaddleOcrProvider from "./paddleOcrProvider";

export function resolvePaddleOcrApiMode(config: PaddleOcrConfig): "layout-parsing" | "aistudio-jobs" {
  if (config.apiMode) return config.apiMode;
  if (config.apiUrl.includes("/api/v2/ocr/jobs")) return "aistudio-jobs";
  return "layout-parsing";
}

export function createPaddleOcrProvider(config: PaddleOcrConfig): IPaddleOcrProvider {
  return resolvePaddleOcrApiMode(config) === "aistudio-jobs"
    ? new AiStudioJobsOcrProvider(config)
    : new PaddleOcrProvider(config);
}
