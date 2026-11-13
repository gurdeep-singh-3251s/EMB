import type { Env } from "@repo/config";

const MAX_AGE_SECONDS = 600;

function base64UrlEncode(data: string): string {
  return Buffer.from(data, "utf8").toString("base64url");
}

function base64UrlDecode(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Buffer.from(new Uint8Array(sig)).toString("base64url");
}

function safeRedirectPath(next: string): string {
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  if (next.includes("://") || next.includes("\\")) return "/dashboard";
  return next.slice(0, 512);
}

export async function signOAuthState(next: string, env: Env): Promise<string> {
  const secret = env.auth.jwtSecret;
  if (!secret) return safeRedirectPath(next);

  const payload = {
    next: safeRedirectPath(next),
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = await hmacSign(body, secret);
  return `${body}.${sig}`;
}

export async function verifyOAuthState(
  state: string | null,
  env: Env,
): Promise<string> {
  if (!state?.trim()) return "/dashboard";
  const secret = env.auth.jwtSecret;
  if (!secret) return safeRedirectPath(state);

  const parts = state.split(".");
  if (parts.length !== 2) return "/dashboard";

  const [body, sig] = parts;
  const expected = await hmacSign(body, secret);
  if (expected.length !== sig.length) return "/dashboard";
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return "/dashboard";

  try {
    const json = JSON.parse(base64UrlDecode(body)) as { next?: string; exp?: number };
    if (typeof json.exp !== "number" || json.exp * 1000 < Date.now()) return "/dashboard";
    return safeRedirectPath(json.next ?? "/dashboard");
  } catch {
    return "/dashboard";
  }
}
