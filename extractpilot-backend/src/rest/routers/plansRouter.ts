import { BETA_ACCESS_NOTICE, BETA_DISCLAIMER, BETA_LAUNCH_LABEL, PLANS, SETUP_OFFER } from "@repo/config/plans";
import type { RestHandlerDeps } from "@repo/types/restTypes";
import { getUsageSnapshot, getActivePlanId } from "../middleware/planLimits";
import { BaseRestController } from "../helper/init";
import { getRequestTenantUserId } from "../requestContext";
import { FIRST_MONTH_DISCOUNT_LABEL } from "@repo/config/plans";
import { cacheGet, cacheSet, tenantCacheKey } from "../../infra/redisCache";

function billingEnabled(env: RestHandlerDeps["env"]): boolean {
  return env.enableBilling && !!env.stripe.secretKey;
}

class PlansHandler extends BaseRestController {
  async listPlans(): Promise<Response> {
    const tenantUserId = getRequestTenantUserId();
    const activePlanId = await getActivePlanId(this.deps.getDb(), this.deps.env, tenantUserId);
    const redis = this.deps.getRedis();
    const cacheKey = tenantCacheKey("plans", tenantUserId, activePlanId);

    const cached = await cacheGet<Record<string, unknown>>(redis, cacheKey);
    if (cached) {
      const res = this.success(cached, null, 200);
      res.headers.set("X-Cache", "HIT");
      return res;
    }

    const body = {
      beta: true,
      inviteOnly: this.deps.env.betaInviteOnly,
      unlimitedQuota: this.deps.env.betaUnlimitedQuota,
      disclaimer: BETA_DISCLAIMER,
      accessNotice: BETA_ACCESS_NOTICE,
      launchLabel: BETA_LAUNCH_LABEL,
      firstMonthDiscount: FIRST_MONTH_DISCOUNT_LABEL,
      plans: Object.values(PLANS),
      setupOffer: SETUP_OFFER,
      activePlanId,
      billingEnabled: billingEnabled(this.deps.env),
    };

    await cacheSet(redis, cacheKey, body, this.deps.env.cachePlansTtlSeconds);
    const res = this.success(body, null, 200);
    res.headers.set("X-Cache", "MISS");
    return res;
  }

  async usage(): Promise<Response> {
    const tenantUserId = getRequestTenantUserId();
    if (!tenantUserId) {
      return Response.json(
        { success: false, message: "Sign in required to view usage.", error: null },
        { status: 401 },
      );
    }
    const planId = await getActivePlanId(this.deps.getDb(), this.deps.env, tenantUserId);
    const snapshot = await getUsageSnapshot(this.deps.getDb(), planId, {
      unlimited: this.deps.env.betaUnlimitedQuota,
      userId: tenantUserId,
    });
    return this.success(
      {
        ...snapshot,
        beta: true,
        inviteOnly: this.deps.env.betaInviteOnly,
        unlimitedQuota: this.deps.env.betaUnlimitedQuota,
        disclaimer: BETA_DISCLAIMER,
        accessNotice: BETA_ACCESS_NOTICE,
      },
      null,
      200,
    );
  }
}

async function handlePlansRouter(req: Request, deps: RestHandlerDeps): Promise<Response | null> {
  const path = new URL(req.url).pathname;
  const handler = new PlansHandler(deps);

  if (path === "/api/v1/plans" && req.method === "GET") {
    return handler.listPlans();
  }
  if (path === "/api/v1/usage" && req.method === "GET") {
    return handler.usage();
  }
  return null;
}

export { handlePlansRouter };
