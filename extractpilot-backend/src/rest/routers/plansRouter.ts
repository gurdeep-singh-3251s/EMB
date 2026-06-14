import { BETA_ACCESS_NOTICE, BETA_DISCLAIMER, BETA_LAUNCH_LABEL, PLANS } from "@repo/config/plans";
import type { RestHandlerDeps } from "@repo/types/restTypes";
import { getUsageSnapshot, getActivePlanId } from "../middleware/planLimits";
import { BaseRestController } from "../helper/init";

function billingEnabled(env: RestHandlerDeps["env"]): boolean {
  return env.enableBilling && !!env.stripe.secretKey;
}

class PlansHandler extends BaseRestController {
  async listPlans(): Promise<Response> {
    const activePlanId = await getActivePlanId(this.deps.getDb(), this.deps.env);
    return this.success(
      {
        beta: true,
        inviteOnly: this.deps.env.betaInviteOnly,
        unlimitedQuota: this.deps.env.betaUnlimitedQuota,
        disclaimer: BETA_DISCLAIMER,
        accessNotice: BETA_ACCESS_NOTICE,
        launchLabel: BETA_LAUNCH_LABEL,
        plans: Object.values(PLANS),
        activePlanId,
        billingEnabled: billingEnabled(this.deps.env),
      },
      null,
      200,
    );
  }

  async usage(): Promise<Response> {
    const planId = await getActivePlanId(this.deps.getDb(), this.deps.env);
    const snapshot = await getUsageSnapshot(this.deps.getDb(), planId, {
      unlimited: this.deps.env.betaUnlimitedQuota,
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
