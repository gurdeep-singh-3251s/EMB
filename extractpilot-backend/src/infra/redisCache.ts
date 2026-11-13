import type { Redis } from "ioredis";

export async function cacheGet<T>(redis: Redis | null, key: string): Promise<T | null> {
  if (!redis) return null;
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
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
): Promise<void> {
  if (!redis || ttlSeconds <= 0) return;
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export function tenantCacheKey(prefix: string, tenantUserId: string | null, suffix = ""): string {
  const shard = tenantUserId ? `t:${tenantUserId}` : "anon";
  return `ep:cache:${prefix}:${shard}${suffix ? `:${suffix}` : ""}`;
}
