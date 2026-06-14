import type { RestHandlerDeps } from "@repo/types/restTypes";

import { handleEmailRouter } from "./routers/emailRouter";

import { handleMailboxRouter } from "./routers/mailboxRouter";

import { handleUserQueryRouter } from "./routers/userQueryRouter";

import { handlePlansRouter } from "./routers/plansRouter";

import { handleBillingRouter } from "./routers/billingRouter";
import { handleExtractionStreamRouter } from "./routers/extractionStreamRouter";
import { handleAuthRouter } from "./routers/authRouter";

import { validateRestApiKey, securityHeaders } from "./middleware/apiKeyAuth";

import { PUBLIC_REST_PATHS } from "../auth/apiKey";

import { checkRateLimit, rateLimitResponse } from "./middleware/rateLimit";

import { getActivePlanId } from "./middleware/planLimits";



async function handleApiV1Request(req: Request, deps: RestHandlerDeps): Promise<Response | null> {

  const path = new URL(req.url).pathname;

  if (!path.startsWith("/api/v1/")) {

    return null;

  }



  // Stripe webhook uses raw body — handle before auth / rate limit

  if (path === "/api/v1/billing/webhook" && req.method === "POST") {

    return handleBillingRouter(req, deps);

  }



  const authError = await validateRestApiKey(req, deps.env);

  if (authError) {

    return authError;

  }



  const authRes = await handleAuthRouter(req, deps);

  if (authRes) return authRes;



  if (!PUBLIC_REST_PATHS.has(path)) {

    const planId = await getActivePlanId(deps.getDb(), deps.env);

    const rl = await checkRateLimit(deps.getRedis(), planId, "rest", path);

    if (rl.limited) {

      return rateLimitResponse(rl.limit);

    }

  }



  const billingRes = await handleBillingRouter(req, deps);

  if (billingRes) return billingRes;



  const plansRes = await handlePlansRouter(req, deps);

  if (plansRes) return plansRes;

  const streamRes = await handleExtractionStreamRouter(req, deps);

  if (streamRes) return streamRes;



  if (path.startsWith("/api/v1/user-query")) {

    return handleUserQueryRouter(req, deps);

  }

  if (path.startsWith("/api/v1/mailbox")) {

    return handleMailboxRouter(req, deps);

  }

  if (path.startsWith("/api/v1/emails")) {

    return handleEmailRouter(req, deps);

  }



  return null;

}



export { handleApiV1Request, securityHeaders };

