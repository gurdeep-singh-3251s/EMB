import type { Env } from "@repo/config";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
};

export type JwtPayload = AuthUser & {
  iat: number;
  exp: number;
};

const JWT_TTL_SECONDS = 7 * 24 * 60 * 60;

function base64UrlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const bin = String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function signHmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return base64UrlEncode(new Uint8Array(sig));
}

async function verifyHmac(secret: string, message: string, signature: string): Promise<boolean> {
  const expected = await signHmac(secret, message);
  if (expected.length !== signature.length) return false;
  let out = 0;
  for (let i = 0; i < expected.length; i++) {
    out |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return out === 0;
}

export function authEnabled(env: Env): boolean {
  return Boolean(env.auth.jwtSecret && env.auth.googleClientId && env.auth.googleClientSecret);
}

export async function signAccessToken(user: AuthUser, env: Env): Promise<string> {
  const secret = env.auth.jwtSecret;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not configured");

  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    ...user,
    iat: now,
    exp: now + JWT_TTL_SECONDS,
  };
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = await signHmac(secret, `${header}.${body}`);
  return `${header}.${body}.${sig}`;
}

export async function verifyAccessToken(token: string, env: Env): Promise<AuthUser | null> {
  const secret = env.auth.jwtSecret;
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  if (!(await verifyHmac(secret, `${header}.${body}`, sig))) return null;

  try {
    const json = JSON.parse(new TextDecoder().decode(base64UrlDecode(body))) as JwtPayload;
    if (typeof json.exp !== "number" || json.exp * 1000 < Date.now()) return null;
    if (!json.id || !json.email) return null;
    return {
      id: json.id,
      email: json.email,
      name: json.name ?? null,
      picture: json.picture ?? null,
    };
  } catch {
    return null;
  }
}

export function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    return token || null;
  }
  return null;
}
