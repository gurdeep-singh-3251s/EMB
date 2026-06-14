import type { Env } from "@repo/config";
import { resolveApiPublicUrl } from "@repo/config";
import type { RestHandlerDeps } from "@repo/types/restTypes";
import { authEnabled, extractBearerToken, signAccessToken, verifyAccessToken } from "../../auth/jwt";
import { upsertGoogleUser } from "../../auth/userRepo";
import { BaseRestController } from "../helper/init";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function oauthRedirectUri(req: Request, env: Env): string {
  return `${resolveApiPublicUrl(req, env.auth.apiPublicUrl)}/api/v1/auth/google/callback`;
}

class AuthHandler extends BaseRestController {
  googleStart(req: Request): Response {
    if (!authEnabled(this.deps.env)) {
      return this.validationError("Google OAuth is not configured on this server", null);
    }

    const next = new URL(req.url).searchParams.get("state") ?? "/dashboard";
    const params = new URLSearchParams({
      client_id: this.deps.env.auth.googleClientId,
      redirect_uri: oauthRedirectUri(req, this.deps.env),
      response_type: "code",
      scope: "openid email profile",
      access_type: "online",
      prompt: "select_account",
      state: next,
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

    const jwt = await signAccessToken(user, this.deps.env);
    const next = url.searchParams.get("state") ?? "/dashboard";
    const safeNext = next.startsWith("/") ? next : "/dashboard";
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

  return null;
}
