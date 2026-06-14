import type { Redis } from "ioredis";
import { PLANS, type PlanId } from "@repo/config/plans";

const WINDOW_SECONDS = 60;

export async function checkRateLimit(
  redis: Redis | null,
  planId: PlanId,
  scope: "rest" | "trpc",
  path: string,
): Promise<{ limited: boolean; limit: number; remaining: number }> {
  const limit = PLANS[planId].limits.requestsPerMinute;
  if (!redis) {
    return { limited: false, limit, remaining: limit };
  }

  const bucket = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  const key = `rl:${scope}:${planId}:${path}:${bucket}`;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS + 1);
  }

  const remaining = Math.max(0, limit - count);
  return { limited: count > limit, limit, remaining };
}

export function rateLimitResponse(limit: number): Response {
  return Response.json(
    {
      success: false,
      message: `Rate limit exceeded — max ${limit} requests/minute on your plan. Try again shortly.`,
      error: null,
    },
    {
      status: 429,
      headers: {
        "Retry-After": "60",
        "X-RateLimit-Limit": String(limit),
      },
    },
  );
}
