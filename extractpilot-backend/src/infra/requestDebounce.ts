import type { Redis } from "ioredis";

export type DebounceResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/** Prevent duplicate expensive operations (e.g. double-click extract). */
function isRedisAvailable(redis: Redis | null): boolean {
  if (!redis) return false;
  if (redis.status && redis.status !== "ready" && redis.status !== "connect") return false;
  return true;
}

export async function acquireDebounce(
  redis: Redis | null,
  key: string,
  ttlSeconds: number,
  timeoutMs = 500,
): Promise<DebounceResult> {
  if (!isRedisAvailable(redis) || ttlSeconds <= 0) return { ok: true };

  try {
    const set = await Promise.race([
      redis.set(key, "1", "EX", ttlSeconds, "NX"),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Redis timeout")), timeoutMs)),
    ]);
    if (set === "OK") return { ok: true };

    const ttl = await Promise.race([
      redis.ttl(key),
      new Promise<number>((_, reject) => setTimeout(() => reject(new Error("Redis timeout")), timeoutMs)),
    ]);
    return { ok: false, retryAfterSeconds: ttl > 0 ? ttl : ttlSeconds };
  } catch {
    return { ok: true };
  }
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
