import type { Env } from "@repo/config";
import { authEnabled, extractBearerToken, verifyAccessToken } from "./jwt";

export function extractApiKey(req: Request): string | null {
  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  const header = req.headers.get("X-API-Key");
  if (header) return header.trim();
  return null;
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

/** Browser dashboard requests from CLIENT_ORIGIN (legacy bypass when OAuth is off). */
export function isTrustedBrowserOrigin(req: Request, env: Env): boolean {
  if (authEnabled(env)) return false;

  const allowed = env.clientOrigin.replace(/\/$/, "");
  let allowedHost: string;
  try {
    allowedHost = new URL(allowed).host;
  } catch {
    return false;
  }

  const origin = req.headers.get("Origin")?.replace(/\/$/, "");
  if (origin && origin === allowed) return true;

  const referer = req.headers.get("Referer");
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin.replace(/\/$/, "");
      if (refOrigin === allowed) return true;
    } catch {
      // ignore invalid referer
    }
  }

  const forwardedHost = req.headers.get("X-Forwarded-Host")?.split(",")[0]?.trim();
  if (forwardedHost && forwardedHost === allowedHost) return true;

  return false;
}

async function isValidSessionToken(req: Request, env: Env): Promise<boolean> {
  if (!authEnabled(env)) return false;
  const token = extractBearerToken(req);
  if (!token) return false;
  const user = await verifyAccessToken(token, env);
  return user !== null;
}

/** API key valid, JWT session valid, auth disabled, or trusted same-origin browser session. */
export async function isRequestAuthorized(req: Request, env: Env): Promise<boolean> {
  if (await isValidSessionToken(req, env)) return true;

  const configured = env.restApiKey?.trim();
  if (!configured) {
    return !authEnabled(env);
  }

  const provided = extractApiKey(req);
  if (provided && timingSafeEqual(provided, configured)) return true;

  return isTrustedBrowserOrigin(req, env);
}

export function isApiKeyValid(req: Request, env: Env): boolean {
  const configured = env.restApiKey?.trim();
  if (!configured) return true;
  const provided = extractApiKey(req);
  return Boolean(provided && timingSafeEqual(provided, configured));
}

export const PUBLIC_REST_PATHS = new Set([
  "/api/v1/plans",
  "/api/v1/usage",
  "/api/v1/billing/webhook",
  "/api/v1/auth/google",
  "/api/v1/auth/google/callback",
]);

export const AUTH_OPTIONAL_REST_PATHS = new Set(["/api/v1/auth/me", "/api/v1/auth/logout"]);
