type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function enabled(level: LogLevel): boolean {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  const min = LEVELS[raw as LogLevel] ?? LEVELS.info;
  return LEVELS[level] >= min;
}

export function paddleLog(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (!enabled(level)) return;
  const line = meta ? `${message} ${JSON.stringify(meta)}` : message;
  console[level](`[paddle]`, line);
}

export function paddleDebug(): boolean {
  return process.env.PIPELINE_DEBUG === "true";
}
