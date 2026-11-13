import Stripe from "stripe";
import { z } from "zod";
import { BETA_ACCESS_NOTICE } from "@repo/config/plans";
import type { PlanId } from "@repo/config/plans";
import type { RestHandlerDeps } from "@repo/types/restTypes";
import { BaseRestController } from "../helper/init";
import { getActivePlanId, getBillingRow, upsertWorkspaceBilling } from "../middleware/planLimits";
import { getRequestTenantUserId } from "../requestContext";

function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey);
}

const PAID_PLAN_IDS = ["standard", "premium", "enterprise"] as const;
type PaidPlanId = (typeof PAID_PLAN_IDS)[number];

function resolveStripePriceId(env: RestHandlerDeps["env"], planId: PaidPlanId): string | null {
  if (planId === "standard") return env.stripe.priceStandard || null;
  if (planId === "premium") return env.stripe.pricePremium || null;
  if (planId === "enterprise") return env.stripe.priceEnterprise || null;
  return null;
}

class BillingHandler extends BaseRestController {
  private requireTenantUserId(): string | Response {
    const userId = getRequestTenantUserId();
    if (!userId) {
      return Response.json(
        { success: false, message: "Sign in required to manage billing.", error: null },
        { status: 401 },
      );
    }
    return userId;
  }

  private billingDisabledResponse(): Response {
    return this.validationError(`Billing is disabled on this environment. ${BETA_ACCESS_NOTICE}`, null);
  }

  private stripe(): Stripe | null {
    const key = this.deps.env.stripe.secretKey;
    if (!key) return null;
    return createStripeClient(key);
  }

  async createCheckout(req: Request): Promise<Response> {
    if (!this.deps.env.enableBilling) {
      return this.billingDisabledResponse();
    }
    const stripe = this.stripe();
    if (!stripe) {
      return this.validationError("Stripe is not configured — set STRIPE_SECRET_KEY and price IDs.", null);
    }

    const body = await this.readJson(req);
    const parsed = z.object({ planId: z.enum(PAID_PLAN_IDS) }).safeParse(body);
    if (!parsed.success) {
      return this.validationError("planId must be standard or premium", parsed.error.flatten());
    }

    const priceId = resolveStripePriceId(this.deps.env, parsed.data.planId);
    if (!priceId) {
      return this.validationError(
        `Stripe price not configured for ${parsed.data.planId} — set STRIPE_PRICE_${parsed.data.planId.toUpperCase()}.`,
        null,
      );
    }

    const tenant = this.requireTenantUserId();
    if (tenant instanceof Response) return tenant;

    const billing = await getBillingRow(this.deps.getDb(), tenant);
    const origin = this.deps.env.clientOrigin.replace(/\/$/, "");

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/pricing?checkout=success`,
      cancel_url: `${origin}/dashboard/pricing?checkout=canceled`,
      metadata: { planId: parsed.data.planId, userId: tenant },
      subscription_data: { metadata: { planId: parsed.data.planId, userId: tenant } },
    };

    const coupon = this.deps.env.stripe.firstMonthCoupon;
    if (coupon) {
      sessionParams.discounts = [{ coupon }];
    }

    if (billing?.stripeCustomerId) {
      sessionParams.customer = billing.stripeCustomerId;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return this.success({ url: session.url, sessionId: session.id }, null, 200);
  }

  async createSetupCheckout(req: Request): Promise<Response> {
    if (!this.deps.env.enableBilling) {
      return this.billingDisabledResponse();
    }
    const stripe = this.stripe();
    if (!stripe) {
      return this.validationError("Stripe is not configured — set STRIPE_SECRET_KEY and price IDs.", null);
    }

    const priceId = this.deps.env.stripe.priceSetup;
    if (!priceId) {
      return this.validationError(
        "Stripe setup price not configured — set STRIPE_PRICE_SETUP for the one-time onboarding product.",
        null,
      );
    }

    const tenant = this.requireTenantUserId();
    if (tenant instanceof Response) return tenant;

    const billing = await getBillingRow(this.deps.getDb(), tenant);
    const origin = this.deps.env.clientOrigin.replace(/\/$/, "");

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/pricing?checkout=setup-success`,
      cancel_url: `${origin}/pricing?checkout=setup-canceled`,
      metadata: { purchaseType: "setup-onboarding", userId: tenant },
    };

    if (billing?.stripeCustomerId) {
      sessionParams.customer = billing.stripeCustomerId;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return this.success({ url: session.url, sessionId: session.id }, null, 200);
  }

  async createPortal(): Promise<Response> {
    if (!this.deps.env.enableBilling) {
      return this.billingDisabledResponse();
    }
    const stripe = this.stripe();
    if (!stripe) {
      return this.validationError("Stripe is not configured.", null);
    }

    const tenant = this.requireTenantUserId();
    if (tenant instanceof Response) return tenant;

    const billing = await getBillingRow(this.deps.getDb(), tenant);
    if (!billing?.stripeCustomerId) {
      return this.validationError("No active Stripe customer — subscribe to a paid plan first.", null);
    }

    const origin = this.deps.env.clientOrigin.replace(/\/$/, "");
    const portal = await stripe.billingPortal.sessions.create({
      customer: billing.stripeCustomerId,
      return_url: `${origin}/dashboard/pricing`,
    });

    return this.success({ url: portal.url }, null, 200);
  }

  async handleWebhook(req: Request): Promise<Response> {
    const stripe = this.stripe();
    const webhookSecret = this.deps.env.stripe.webhookSecret;
    if (!stripe || !webhookSecret) {
      return Response.json({ success: false, message: "Webhook not configured" }, { status: 503 });
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return Response.json({ success: false, message: "Missing stripe-signature" }, { status: 400 });
    }

    const rawBody = await req.text();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid signature";
      return Response.json({ success: false, message }, { status: 400 });
    }

    const db = this.deps.getDb();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const planId = session.metadata?.planId as PlanId;
        const userId = session.metadata?.userId;
        if (
          userId &&
          (planId === "standard" || planId === "premium" || planId === "enterprise")
        ) {
          await upsertWorkspaceBilling(db, userId, {
            planId,
            stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
            stripeSubscriptionId:
              typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null,
            subscriptionStatus: "active",
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const planId = sub.metadata?.planId as PlanId | undefined;
        const userId = sub.metadata?.userId;
        const active = sub.status === "active" || sub.status === "trialing";
        if (
          userId &&
          (planId === "standard" || planId === "premium" || planId === "enterprise")
        ) {
          await upsertWorkspaceBilling(db, userId, {
            planId: active ? planId : "free",
            stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
            stripeSubscriptionId: sub.id,
            subscriptionStatus: active ? "active" : sub.status,
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) {
          await upsertWorkspaceBilling(db, userId, {
            planId: "free",
            stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
            stripeSubscriptionId: null,
            subscriptionStatus: "canceled",
          });
        }
        break;
      }
      default:
        break;
    }

    return Response.json({ received: true });
  }

  async status(): Promise<Response> {
    const tenant = this.requireTenantUserId();
    if (tenant instanceof Response) return tenant;

    const planId = await getActivePlanId(this.deps.getDb(), this.deps.env, tenant);
    const billing = await getBillingRow(this.deps.getDb(), tenant);

    return this.success(
      {
        activePlanId: planId,
        billingEnabled: this.deps.env.enableBilling && !!this.deps.env.stripe.secretKey,
        inviteOnly: this.deps.env.betaInviteOnly,
        subscriptionStatus: billing?.subscriptionStatus ?? "none",
        hasStripeCustomer: !!billing?.stripeCustomerId,
      },
      null,
      200,
    );
  }
}

async function handleBillingRouter(req: Request, deps: RestHandlerDeps): Promise<Response | null> {
  const path = new URL(req.url).pathname;
  const handler = new BillingHandler(deps);

  if (path === "/api/v1/billing/webhook" && req.method === "POST") {
    return handler.handleWebhook(req);
  }
  if (path === "/api/v1/billing/checkout" && req.method === "POST") {
    return handler.createCheckout(req);
  }
  if (path === "/api/v1/billing/checkout-setup" && req.method === "POST") {
    return handler.createSetupCheckout(req);
  }
  if (path === "/api/v1/billing/portal" && req.method === "POST") {
    return handler.createPortal();
  }
  if (path === "/api/v1/billing/status" && req.method === "GET") {
    return handler.status();
  }
  return null;
}

export { handleBillingRouter };
