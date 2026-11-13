import type { Env } from "@repo/config";
import {
  AUTH_OPTIONAL_REST_PATHS,
  extractApiKey,
  isRequestAuthorized,
  PUBLIC_REST_PATHS,
} from "../../auth/apiKey";

export { securityHeaders } from "./securityHeaders";
export { PUBLIC_REST_PATHS };

export async function validateRestApiKey(req: Request, env: Env): Promise<Response | null> {
  const path = new URL(req.url).pathname;

  if (PUBLIC_REST_PATHS.has(path)) {
    return null;
  }

  if (AUTH_OPTIONAL_REST_PATHS.has(path)) {
    return null;
  }

  const oauthEnabled = Boolean(env.auth.googleClientId && env.auth.jwtSecret);
  const configured = env.restApiKey?.trim();

  if (!oauthEnabled && !configured) {
    return null;
  }

  if (await isRequestAuthorized(req, env)) {
    return null;
  }

  return Response.json(
    {
      success: false,
      message: oauthEnabled
        ? "Unauthorized — sign in with Google (JWT Bearer) or use X-API-Key if integrator access is enabled"
        : "Unauthorized — provide a valid API key via Authorization: Bearer or X-API-Key",
      error: null,
    },
    { status: 401 },
  );
}

export { extractApiKey, isRequestAuthorized };
