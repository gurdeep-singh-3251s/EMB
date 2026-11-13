import type { Redis } from "ioredis";

export type DebounceResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/** Prevent duplicate expensive operations (e.g. double-click extract). */
export async function acquireDebounce(
  redis: Redis | null,
  key: string,
  ttlSeconds: number,
): Promise<DebounceResult> {
  if (!redis || ttlSeconds <= 0) return { ok: true };

  const set = await redis.set(key, "1", "EX", ttlSeconds, "NX");
  if (set === "OK") return { ok: true };

  const ttl = await redis.ttl(key);
  return { ok: false, retryAfterSeconds: ttl > 0 ? ttl : ttlSeconds };
}

export function debounceResponse(retryAfterSeconds: number, action: string): Response {
  return Response.json(
    {
      success: false,
      message: `${action} already in progress — please wait ${retryAfterSeconds}s before retrying.`,
      error: null,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-Debounced": "true",
      },
    },
  );
}
