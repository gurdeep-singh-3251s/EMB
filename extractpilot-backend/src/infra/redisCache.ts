import type { Redis } from "ioredis";

function isRedisAvailable(redis: Redis | null): boolean {
  if (!redis) return false;
  if (redis.status && redis.status !== "ready" && redis.status !== "connect") return false;
  return true;
}

export async function cacheGet<T>(redis: Redis | null, key: string, timeoutMs = 500): Promise<T | null> {
  if (!isRedisAvailable(redis)) return null;
  try {
    const raw = await Promise.race([
      redis.get(key),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Redis timeout")), timeoutMs)),
    ]);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  redis: Redis | null,
  key: string,
  value: unknown,
  ttlSeconds: number,
  timeoutMs = 500,
): Promise<void> {
  if (!isRedisAvailable(redis) || ttlSeconds <= 0) return;
  try {
    await Promise.race([
      redis.set(key, JSON.stringify(value), "EX", ttlSeconds),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error("Redis timeout")), timeoutMs)),
    ]);
  } catch {
    // ignore cache write failures
  }
}

export async function cacheDel(redis: Redis | null, key: string, timeoutMs = 500): Promise<void> {
  if (!isRedisAvailable(redis)) return;
  try {
    await Promise.race([
      redis.del(key),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error("Redis timeout")), timeoutMs)),
    ]);
  } catch {
    // ignore
  }
}

export function tenantCacheKey(prefix: string, tenantUserId: string | null, suffix = ""): string {
  const shard = tenantUserId ? `t:${tenantUserId}` : "anon";
  return `ep:cache:${prefix}:${shard}${suffix ? `:${suffix}` : ""}`;
}
