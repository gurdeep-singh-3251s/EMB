type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function getLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") return raw;
  return "info";
}

function enabled(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[getLevel()];
}

function prefix(scope: string): string {
  return `[${scope}]`;
}

export function log(scope: string, level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (!enabled(level)) return;
  const line = meta ? `${message} ${JSON.stringify(meta)}` : message;
  // eslint-disable-next-line no-console
  console[level](prefix(scope), line);
}

