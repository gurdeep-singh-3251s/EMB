import type { RestHandlerDeps } from "@repo/types/restTypes";
import { authEnabled } from "../auth/jwt";
import { mustUseTenantAuth, pathRequiresTenant, resolveTenantUser } from "../auth/tenant";
import { handleEmailRouter } from "./routers/emailRouter";
import { handleMailboxRouter } from "./routers/mailboxRouter";
import { handleMailboxesRouter } from "./routers/mailboxesRouter";
import { handleUserQueryRouter } from "./routers/userQueryRouter";
import { handlePlansRouter } from "./routers/plansRouter";
import { handleBillingRouter } from "./routers/billingRouter";
import { handleExtractionStreamRouter } from "./routers/extractionStreamRouter";
import { handleAuthRouter } from "./routers/authRouter";
import { handlePromptTemplatesRouter } from "./routers/promptTemplatesRouter";
import { handlePromptStudioRouter } from "./routers/promptStudioRouter";
import { handleOpsRouter } from "./routers/opsRouter";
import { handleIntegrationsRouter } from "./routers/integrationsRouter";
import { handleWorkspaceRouter } from "./routers/workspaceRouter";
import { validateRestApiKey, securityHeaders } from "./middleware/apiKeyAuth";
import { PUBLIC_REST_PATHS } from "../auth/apiKey";
import { checkRateLimit, rateLimitResponse } from "./middleware/rateLimit";
import { resolveClientIp } from "../auth/requestMeta";
import { getActivePlanId } from "./middleware/planLimits";
import { requestContext } from "./requestContext";
import {
  guardExtractDebouncing,
  guardUserQueryDebouncing,
  validateAllowedMethod,
  validateMutationContentType,
} from "./middleware/apiGuards";

async function handleApiV1RequestInner(req: Request, deps: RestHandlerDeps): Promise<Response | null> {
  const path = new URL(req.url).pathname;

  if (!path.startsWith("/api/v1/")) {
    return null;
  }

  const methodError = validateAllowedMethod(req);
  if (methodError) return methodError;

  if (path === "/api/v1/billing/webhook" && req.method === "POST") {
    return handleBillingRouter(req, deps);
  }

  const contentTypeError = validateMutationContentType(req);
  if (contentTypeError) return contentTypeError;

  const authError = await validateRestApiKey(req, deps.env);
  if (authError) {
    return authError;
  }

  if (mustUseTenantAuth(deps.env) && pathRequiresTenant(path) && !deps.getTenantUserId()) {
    return Response.json(
      {
        success: false,
        message:
          "Sign in required. ExtractPilot is multi-tenant — you only see your own mailboxes, schemas, and extracted emails.",
        error: null,
      },
      { status: 401 },
    );
  }

  const authRes = await handleAuthRouter(req, deps);
  if (authRes) return authRes;

  {
    const tenantUserId = deps.getTenantUserId();
    let planId: any = "free";
    try {
      planId = await getActivePlanId(deps.getDb(), deps.env, tenantUserId);
    } catch {
      planId = "free";
    }
    const rl = await checkRateLimit({
      redis: deps.getRedis(),
      env: deps.env,
      planId,
      tenantUserId,
      clientIp: resolveClientIp(req),
      path,
    });
    if (rl.limited) {
      return rateLimitResponse(rl.limit);
    }
  }

  {
    const tenantUserId = deps.getTenantUserId();
    const debounceExtract = await guardExtractDebouncing(req, deps.getRedis(), deps.env, tenantUserId);
    if (debounceExtract) return debounceExtract;
    const debounceQuery = await guardUserQueryDebouncing(req, deps.getRedis(), deps.env, tenantUserId);
    if (debounceQuery) return debounceQuery;
  }

  const billingRes = await handleBillingRouter(req, deps);
  if (billingRes) return billingRes;

  const plansRes = await handlePlansRouter(req, deps);
  if (plansRes) return plansRes;

  const templatesRes = await handlePromptTemplatesRouter(req, deps);
  if (templatesRes) return templatesRes;

  const studioRes = await handlePromptStudioRouter(req, deps);
  if (studioRes) return studioRes;

  const opsRes = await handleOpsRouter(req, deps);
  if (opsRes) return opsRes;

  const integrationsRes = await handleIntegrationsRouter(req, deps);
  if (integrationsRes) return integrationsRes;

  const workspaceRes = await handleWorkspaceRouter(req, deps);
  if (workspaceRes) return workspaceRes;

  const streamRes = await handleExtractionStreamRouter(req, deps);
  if (streamRes) return streamRes;

  if (path.startsWith("/api/v1/user-query")) {
    return handleUserQueryRouter(req, deps);
  }

  if (path.startsWith("/api/v1/mailboxes")) {
    return handleMailboxesRouter(req, deps);
  }

  if (path.startsWith("/api/v1/mailbox")) {
    return handleMailboxRouter(req, deps);
  }

  if (path.startsWith("/api/v1/emails")) {
    return handleEmailRouter(req, deps);
  }

  return null;
}

async function handleApiV1Request(req: Request, deps: RestHandlerDeps): Promise<Response | null> {
  const tenantUser = authEnabled(deps.env) ? await resolveTenantUser(req, deps.env) : null;
  return requestContext.run({ tenantUserId: tenantUser?.id ?? null }, () =>
    handleApiV1RequestInner(req, deps),
  );
}

export { handleApiV1Request, securityHeaders };
