import type { Redis } from "ioredis";
import type { Env } from "@repo/config";
import { PLANS, type PlanId } from "@repo/config/plans";
import { PUBLIC_REST_PATHS } from "../../auth/apiKey";
import { hashRateLimitKey } from "../../auth/requestMeta";

const WINDOW_SECONDS = 60;

const EXPENSIVE_EXACT_PATHS = new Set(["/api/v1/mailbox/extract-emails"]);

export type RateLimitInput = {
  redis: Redis | null;
  env: Env;
  planId: PlanId;
  tenantUserId: string | null;
  clientIp: string;
  path: string;
};

async function incrementBucket(
  redis: Redis | null,
  key: string,
  limit: number,
): Promise<{ limited: boolean; limit: number; remaining: number }> {
  if (!redis) {
    return { limited: false, limit, remaining: limit };
  }

  const bucket = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  const redisKey = `${key}:${bucket}`;

  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, WINDOW_SECONDS + 1);
  }

  const remaining = Math.max(0, limit - count);
  return { limited: count > limit, limit, remaining };
}

export async function checkRateLimit(input: RateLimitInput): Promise<{
  limited: boolean;
  limit: number;
  remaining: number;
}> {
  const ipHash = hashRateLimitKey(input.clientIp);
  const subject = input.tenantUserId
    ? `u:${input.tenantUserId}`
    : `ip:${ipHash}`;

  const global = await incrementBucket(
    input.redis,
    `rl:global:ip:${ipHash}`,
    input.env.rateLimitGlobalIpPerMinute,
  );
  if (global.limited) return global;

  if (PUBLIC_REST_PATHS.has(input.path)) {
    return incrementBucket(
      input.redis,
      `rl:public:${input.path}:${ipHash}`,
      input.env.rateLimitPublicPerMinute,
    );
  }

  if (EXPENSIVE_EXACT_PATHS.has(input.path)) {
    return incrementBucket(
      input.redis,
      `rl:expensive:${subject}`,
      input.env.rateLimitExtractPerMinute,
    );
  }

  const planLimit = PLANS[input.planId].limits.requestsPerMinute;
  return incrementBucket(input.redis, `rl:plan:${input.planId}:${subject}:${input.path}`, planLimit);
}

/** @deprecated use checkRateLimit with RateLimitInput */
export async function checkRateLimitLegacy(
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
