import type { Env } from "@repo/config";
import type { Redis } from "ioredis";
import { acquireDebounce, debounceResponse } from "../../infra/requestDebounce";
import { resolveClientIp } from "../../auth/requestMeta";
import { hashRateLimitKey } from "../../auth/requestMeta";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH"]);

const EXTRACT_PATH = "/api/v1/mailbox/extract-emails";
const USER_QUERY_PATH = "/api/v1/user-query";

export function validateAllowedMethod(req: Request): Response | null {
  const allowed = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]);
  if (!allowed.has(req.method)) {
    return Response.json(
      { success: false, message: `Method ${req.method} not allowed`, error: null },
      { status: 405 },
    );
  }
  return null;
}

export function validateMutationContentType(req: Request): Response | null {
  if (!MUTATION_METHODS.has(req.method)) return null;

  const path = new URL(req.url).pathname;
  if (path === "/api/v1/billing/webhook") return null;

  const contentType = req.headers.get("content-type") ?? "";
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  if (!hasBody) return null;

  if (contentType.includes("application/json") || contentType.includes("+json")) {
    return null;
  }

  if (req.headers.get("content-length") === "0") return null;

  return Response.json(
    {
      success: false,
      message: "Content-Type must be application/json for write requests",
      error: null,
    },
    { status: 415 },
  );
}

export async function guardExtractDebouncing(
  req: Request,
  redis: Redis | null,
  env: Env,
  tenantUserId: string | null,
): Promise<Response | null> {
  if (req.method !== "POST" || new URL(req.url).pathname !== EXTRACT_PATH) {
    return null;
  }

  const shard = tenantUserId ?? `ip:${hashRateLimitKey(resolveClientIp(req))}`;
  const key = `ep:debounce:extract:${shard}`;
  const ttl = env.extractDebounceSeconds;

  const result = await acquireDebounce(redis, key, ttl);
  if (result.ok) return null;
  return debounceResponse(result.retryAfterSeconds, "Email extraction");
}

export async function guardUserQueryDebouncing(
  req: Request,
  redis: Redis | null,
  env: Env,
  tenantUserId: string | null,
): Promise<Response | null> {
  if (req.method !== "POST" || new URL(req.url).pathname !== USER_QUERY_PATH) {
    return null;
  }
  if (!tenantUserId) return null;

  const key = `ep:debounce:user-query:t:${tenantUserId}`;
  const result = await acquireDebounce(redis, key, env.userQueryDebounceSeconds);
  if (result.ok) return null;
  return debounceResponse(result.retryAfterSeconds, "Schema update");
}

export function attachRateLimitHeaders(res: Response, limit: number, remaining: number): Response {
  const headers = new Headers(res.headers);
  headers.set("X-RateLimit-Limit", String(limit));
  headers.set("X-RateLimit-Remaining", String(Math.max(0, remaining)));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
