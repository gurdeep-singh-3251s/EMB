import type { PipelineLogEvent, PipelineLogMeta } from "./pipelineLogTypes";
import { log } from "../shared/logger";

export { traceMeta } from "./pipelineLogTypes";
export type { PipelineLogEvent, PipelineLogMeta, TraceMeta } from "./pipelineLogTypes";

export function logPipeline(step: string, event: PipelineLogEvent, meta?: PipelineLogMeta): void {
  const level = event === "error" ? "error" : event === "detail" && !pipelineDebug() ? "debug" : "info";
  log("pipeline", level, `${step} — ${event}`, meta);
}

export function pipelineDebug(): boolean {
  return process.env.PIPELINE_DEBUG === "true";
}
