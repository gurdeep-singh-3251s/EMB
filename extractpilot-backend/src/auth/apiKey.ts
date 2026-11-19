import type { Env } from "@repo/config";
import { authEnabled, extractBearerToken, verifyAccessToken } from "./jwt";
import { looksLikeJwt } from "./tokenKind";

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
  if (!token || !looksLikeJwt(token)) return false;
  const user = await verifyAccessToken(token, env);
  return user !== null;
}

function integratorKeyValid(req: Request, env: Env): boolean {
  const configured = env.restApiKey?.trim();
  if (!configured || !env.integratorApiKeyEnabled) return false;
  const headerKey = req.headers.get("X-API-Key")?.trim();
  if (!headerKey) return false;
  return timingSafeEqual(headerKey, configured);
}

/** API key valid, JWT session valid, auth disabled, or trusted same-origin browser session. */
export async function isRequestAuthorized(req: Request, env: Env): Promise<boolean> {
  if (authEnabled(env)) {
    if (await isValidSessionToken(req, env)) return true;
    return integratorKeyValid(req, env);
  }

  const configured = env.restApiKey?.trim();
  if (!configured) {
    return true;
  }

  const bearer = extractBearerToken(req);
  if (bearer && timingSafeEqual(bearer, configured)) return true;

  const headerKey = req.headers.get("X-API-Key")?.trim();
  if (headerKey && timingSafeEqual(headerKey, configured)) return true;

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
  "/api/v1/prompt-templates",
  "/api/v1/llm-models",
  "/api/v1/billing/webhook",
  "/api/v1/billing/razorpay/callback",
  "/api/v1/auth/google",
  "/api/v1/auth/google/callback",
  "/api/v1/auth/signup",
  "/api/v1/auth/login",
]);

export const AUTH_OPTIONAL_REST_PATHS = new Set(["/api/v1/auth/me", "/api/v1/auth/logout"]);
