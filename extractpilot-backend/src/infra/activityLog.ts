import type { Database } from "@repo/db";
import { recordWorkspaceAudit } from "./workspaceIntegrations";
import { resolveClientIp } from "../auth/requestMeta";

type ActivityRule = {
  test: (method: string, path: string) => boolean;
  action: string;
  summary: string;
};

const RULES: ActivityRule[] = [
  { test: (m, p) => m === "POST" && p === "/api/v1/auth/logout", action: "auth.logout", summary: "Signed out" },
  { test: (m, p) => m === "POST" && p === "/api/v1/mailboxes", action: "mailbox.added", summary: "Added a mailbox" },
  { test: (m, p) => m === "POST" && p === "/api/v1/mailboxes/activate", action: "mailbox.activated", summary: "Switched the active mailbox" },
  { test: (m, p) => m === "PUT" && p === "/api/v1/mailbox/config", action: "mailbox.updated", summary: "Updated mailbox connection" },
  { test: (m, p) => m === "DELETE" && p === "/api/v1/mailbox/config", action: "mailbox.removed", summary: "Removed mailbox connection" },
  { test: (m, p) => m === "POST" && p === "/api/v1/mailbox/extract-emails", action: "extraction.started", summary: "Started an extraction run" },
  { test: (m, p) => m === "POST" && p === "/api/v1/user-query", action: "requirements.saved", summary: "Saved extraction requirements" },
  { test: (m, p) => m === "POST" && p === "/api/v1/prompt-studio/enhance", action: "prompt.enhanced", summary: "Enhanced a prompt" },
  { test: (m, p) => m === "POST" && p === "/api/v1/prompt-studio/ab-compare", action: "prompt.compared", summary: "Compared prompt variants" },
  { test: (m, p) => m === "POST" && p.includes("/activate"), action: "prompt.activated", summary: "Activated a saved prompt" },
  { test: (m, p) => (m === "POST" || m === "PATCH" || m === "PUT" || m === "DELETE") && p.startsWith("/api/v1/prompt-studio"), action: "prompt.updated", summary: "Updated a prompt" },
  { test: (m, p) => m === "PATCH" && p === "/api/v1/integrations", action: "integrations.updated", summary: "Updated integrations" },
  { test: (m, p) => m === "POST" && p === "/api/v1/billing/checkout", action: "billing.checkout", summary: "Started a plan checkout" },
  { test: (m, p) => m === "POST" && p === "/api/v1/billing/checkout-setup", action: "billing.setup", summary: "Started guided setup checkout" },
  { test: (m, p) => m === "POST" && p === "/api/v1/billing/portal", action: "billing.portal", summary: "Opened the billing portal" },
  { test: (m, p) => m === "POST" && p === "/api/v1/ops/retry-failure", action: "ops.retry", summary: "Retried a failed extraction" },
  { test: (m, p) => m === "POST" && p === "/api/v1/ops/replay-dlq", action: "ops.replay", summary: "Replayed the dead-letter queue" },
  { test: (m, p) => m === "POST" && p === "/api/v1/ops/retry-all-failures", action: "ops.retry_all", summary: "Retried all failed extractions" },
  { test: (m, p) => p.includes("/human-review") || p.includes("/review"), action: "email.reviewed", summary: "Reviewed an extracted email" },
];

const SKIP_EXACT = new Set([
  "/api/v1/audit-log",
  "/api/v1/auth/me",
  "/api/v1/auth/google",
  "/api/v1/auth/login",
  "/api/v1/auth/signup",
  "/api/v1/plans",
  "/api/v1/usage",
  "/api/v1/billing/webhook",
  "/api/v1/billing/razorpay/callback",
]);

export function describeActivity(method: string, path: string): { action: string; summary: string } | null {
  if (SKIP_EXACT.has(path)) return null;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;
  const rule = RULES.find((entry) => entry.test(method, path));
  if (rule) return { action: rule.action, summary: rule.summary };
  return {
    action: "api.write",
    summary: `${method} ${path}`,
  };
}

export async function logRequestActivity(
  db: Database,
  req: Request,
  res: Response,
  actor: { id: string; email?: string | null; name?: string | null } | null,
): Promise<void> {
  if (!actor?.id) return;
  const url = new URL(req.url);
  const described = describeActivity(req.method, url.pathname);
  if (!described) return;

  const userAgent = req.headers.get("user-agent")?.slice(0, 180) ?? null;
  try {
    await recordWorkspaceAudit(db, actor.id, described.action, {
      summary: described.summary,
      method: req.method,
      path: url.pathname,
      status: res.status,
      actorEmail: actor.email ?? null,
      actorName: actor.name ?? null,
      ip: resolveClientIp(req),
      userAgent,
    });
  } catch (error) {
    console.warn("[activity] failed to record", error);
  }
}
