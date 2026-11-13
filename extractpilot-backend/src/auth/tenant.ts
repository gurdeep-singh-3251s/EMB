import type { Env } from "@repo/config";
import { authEnabled, extractBearerToken, verifyAccessToken, type AuthUser } from "./jwt";

const TENANT_SCOPED_PREFIXES = [
  "/api/v1/emails",
  "/api/v1/user-query",
  "/api/v1/user-queries",
  "/api/v1/prompt-studio",
  "/api/v1/llm-models",
  "/api/v1/ops",
  "/api/v1/integrations",
  "/api/v1/audit-log",
  "/api/v1/workspace",
  "/api/v1/mailbox",
  "/api/v1/mailboxes",
  "/api/v1/billing/checkout",
  "/api/v1/billing/checkout-setup",
  "/api/v1/billing/portal",
  "/api/v1/billing/status",
  "/api/v1/extraction",
  "/api/v1/usage",
] as const;

export function pathRequiresTenant(path: string): boolean {
  return TENANT_SCOPED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export async function resolveTenantUser(req: Request, env: Env): Promise<AuthUser | null> {
  const token = extractBearerToken(req);
  if (!token) return null;
  const user = await verifyAccessToken(token, env);
  if (user) return user;
  return null;
}

export function mustUseTenantAuth(env: Env): boolean {
  return authEnabled(env);
}
