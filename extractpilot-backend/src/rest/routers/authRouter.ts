import type { Env } from "@repo/config";
import { resolveApiPublicUrl } from "@repo/config";
import type { RestHandlerDeps } from "@repo/types/restTypes";
import { authEnabled, extractBearerToken, signAccessToken, verifyAccessToken } from "../../auth/jwt";
import { signOAuthState, verifyOAuthState } from "../../auth/oauthState";
import { authenticatePasswordUser, registerPasswordUser, upsertGoogleUser } from "../../auth/userRepo";
import { normalizeEmail, normalizeName, validatePassword } from "../../auth/password";
import { resolveClientIp } from "../../auth/requestMeta";
import { recordWorkspaceAudit } from "../../infra/workspaceIntegrations";
import { BaseRestController } from "../helper/init";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function oauthRedirectUri(req: Request, env: Env): string {
  return `${resolveApiPublicUrl(req, env.auth.apiPublicUrl)}/api/v1/auth/google/callback`;
}

class AuthHandler extends BaseRestController {
  async googleStart(req: Request): Promise<Response> {
    if (!authEnabled(this.deps.env)) {
      return this.validationError("Google OAuth is not configured on this server", null);
    }

    const next = new URL(req.url).searchParams.get("state") ?? "/dashboard";
    const signedState = await signOAuthState(next, this.deps.env);
    const params = new URLSearchParams({
      client_id: this.deps.env.auth.googleClientId,
      redirect_uri: oauthRedirectUri(req, this.deps.env),
      response_type: "code",
      scope: "openid email profile",
      access_type: "online",
      prompt: "select_account",
      state: signedState,
    });

    return Response.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`, 302);
  }

  async googleCallback(req: Request): Promise<Response> {
    if (!authEnabled(this.deps.env)) {
      return this.validationError("Google OAuth is not configured on this server", null);
    }

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error || !code) {
      const redirect = `${this.deps.env.clientOrigin}/login?error=oauth_denied`;
      return Response.redirect(redirect, 302);
    }

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.deps.env.auth.googleClientId,
        client_secret: this.deps.env.auth.googleClientSecret,
        redirect_uri: oauthRedirectUri(req, this.deps.env),
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("[auth] Google token exchange failed", await tokenRes.text());
      return Response.redirect(`${this.deps.env.clientOrigin}/login?error=oauth_token`, 302);
    }

    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) {
      return Response.redirect(`${this.deps.env.clientOrigin}/login?error=oauth_token`, 302);
    }

    const profileRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!profileRes.ok) {
      return Response.redirect(`${this.deps.env.clientOrigin}/login?error=oauth_profile`, 302);
    }

    const profile = (await profileRes.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
    };

    if (!profile.sub || !profile.email) {
      return Response.redirect(`${this.deps.env.clientOrigin}/login?error=oauth_profile`, 302);
    }

    const user = await upsertGoogleUser(this.deps.getDb(), {
      sub: profile.sub,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    });

    await recordWorkspaceAudit(this.deps.getDb(), user.id, "auth.signed_in", {
      summary: "Signed in with Google",
      method: "GET",
      path: "/api/v1/auth/google/callback",
      status: 302,
      actorEmail: user.email,
      actorName: user.name,
      ip: resolveClientIp(req),
      userAgent: req.headers.get("user-agent")?.slice(0, 180) ?? null,
    }).catch(() => undefined);

    const jwt = await signAccessToken(user, this.deps.env);
    const safeNext = await verifyOAuthState(url.searchParams.get("state"), this.deps.env);
    const redirect = `${this.deps.env.clientOrigin}/auth/callback?token=${encodeURIComponent(jwt)}&state=${encodeURIComponent(safeNext)}`;
    return Response.redirect(redirect, 302);
  }

  async me(req: Request): Promise<Response> {
    const token = extractBearerToken(req);
    if (!token) {
      return Response.json({ success: false, message: "Not authenticated", error: null }, { status: 401 });
    }
    const user = await verifyAccessToken(token, this.deps.env);
    if (!user) {
      return Response.json({ success: false, message: "Invalid or expired session", error: null }, { status: 401 });
    }
    return this.success(user, null, 200);
  }

  logout(): Response {
    return this.success({ ok: true }, "Logged out", 200);
  }

  async signup(req: Request): Promise<Response> {
    if (!this.deps.env.auth.jwtSecret) {
      return this.validationError("Sign-in is not configured on this server", null);
    }
    const body = await readJson(req);
    const email = normalizeEmail(body?.email);
    const passwordError = validatePassword(body?.password);
    if (!email) return this.validationError("Enter a valid email address.", null);
    if (passwordError) return this.validationError(passwordError, null);

    const result = await registerPasswordUser(this.deps.getDb(), {
      email,
      password: String(body?.password),
      name: normalizeName(body?.name),
    });
    if (!result.ok) return this.validationError(result.message, null);

    await this.auditAuth(req, result.user, "auth.signed_up", "Created an email account");
    const token = await signAccessToken(result.user, this.deps.env);
    return this.success({ token, user: result.user }, "Account created", 201);
  }

  async login(req: Request): Promise<Response> {
    if (!this.deps.env.auth.jwtSecret) {
      return this.validationError("Sign-in is not configured on this server", null);
    }
    const body = await readJson(req);
    const email = normalizeEmail(body?.email);
    if (!email || typeof body?.password !== "string" || !body.password) {
      return this.validationError("Enter your email and password.", null);
    }

    const result = await authenticatePasswordUser(this.deps.getDb(), {
      email,
      password: body.password,
    });
    if (!result.ok) return this.validationError(result.message, null);

    await this.auditAuth(req, result.user, "auth.signed_in", "Signed in with email");
    const token = await signAccessToken(result.user, this.deps.env);
    return this.success({ token, user: result.user }, "Signed in", 200);
  }

  private async auditAuth(
    req: Request,
    user: { id: string; email: string; name: string | null },
    action: string,
    summary: string,
  ): Promise<void> {
    await recordWorkspaceAudit(this.deps.getDb(), user.id, action, {
      summary,
      method: "POST",
      path: new URL(req.url).pathname,
      status: action === "auth.signed_up" ? 201 : 200,
      actorEmail: user.email,
      actorName: user.name,
      ip: resolveClientIp(req),
      userAgent: req.headers.get("user-agent")?.slice(0, 180) ?? null,
    }).catch(() => undefined);
  }
}

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = (await req.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function handleAuthRouter(req: Request, deps: RestHandlerDeps): Promise<Response | null> {
  const path = new URL(req.url).pathname;
  const handler = new AuthHandler(deps);

  if (path === "/api/v1/auth/google" && req.method === "GET") {
    return handler.googleStart(req);
  }
  if (path === "/api/v1/auth/google/callback" && req.method === "GET") {
    return handler.googleCallback(req);
  }
  if (path === "/api/v1/auth/me" && req.method === "GET") {
    return handler.me(req);
  }
  if (path === "/api/v1/auth/logout" && req.method === "POST") {
    return handler.logout();
  }
  if (path === "/api/v1/auth/signup" && req.method === "POST") {
    return handler.signup(req);
  }
  if (path === "/api/v1/auth/login" && req.method === "POST") {
    return handler.login(req);
  }

  return null;
}
