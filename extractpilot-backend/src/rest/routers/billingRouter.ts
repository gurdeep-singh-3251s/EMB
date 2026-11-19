import Stripe from "stripe";
import { z } from "zod";
import { BETA_ACCESS_NOTICE } from "@repo/config/plans";
import type { PlanId } from "@repo/config/plans";
import type { RestHandlerDeps } from "@repo/types/restTypes";
import { BaseRestController } from "../helper/init";
import { getActivePlanId, getBillingRow, upsertWorkspaceBilling } from "../middleware/planLimits";
import { getRequestTenantUserId } from "../requestContext";
import { resolveCheckoutMode, stripeCheckoutReady } from "../billingMode";
import { cacheDel, tenantCacheKey } from "../../infra/redisCache";
import { findUserById } from "../../auth/userRepo";
import { resolveApiPublicUrl } from "@repo/config";
import {
  createPaymentLink,
  fetchPaymentLink,
  paidPlanFromNotes,
  resolveChargeAmount,
  verifyPaymentLinkCallback,
  verifyWebhookSignature,
} from "../../billing/razorpay";

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

  private async clearPlansCache(userId: string, planId: string) {
    try {
      await cacheDel(this.deps.getRedis(), tenantCacheKey("plans", userId, planId));
      await cacheDel(this.deps.getRedis(), tenantCacheKey("plans", userId, "free"));
    } catch {
      // cache best-effort
    }
  }

  async createCheckout(req: Request): Promise<Response> {
    const mode = resolveCheckoutMode(this.deps.env);
    if (mode === "off") {
      return this.billingDisabledResponse();
    }

    const body = await this.readJson(req);
    const parsed = z.object({ planId: z.enum(PAID_PLAN_IDS) }).safeParse(body);
    if (!parsed.success) {
      return this.validationError("planId must be standard, premium, or enterprise", parsed.error.flatten());
    }

    const tenant = this.requireTenantUserId();
    if (tenant instanceof Response) return tenant;

    const origin = this.deps.env.clientOrigin.replace(/\/$/, "");

    if (mode === "razorpay") {
      return this.startRazorpayCheckout(req, {
        userId: tenant,
        description: `ExtractPilot ${parsed.data.planId}`,
        amount: resolveChargeAmount(parsed.data.planId, this.deps.env.razorpay),
        notes: { planId: parsed.data.planId, userId: tenant },
      });
    }

    if (mode === "demo") {
      await upsertWorkspaceBilling(this.deps.getDb(), tenant, {
        planId: parsed.data.planId,
        subscriptionStatus: "active",
      });
      await this.clearPlansCache(tenant, parsed.data.planId);
      return this.success(
        {
          url: `${origin}/dashboard/pricing?checkout=success&mode=demo`,
          sessionId: `demo_${parsed.data.planId}_${Date.now()}`,
          checkoutMode: "demo",
        },
        "Plan activated for this workspace (demo checkout).",
        200,
      );
    }

    const stripe = this.stripe();
    if (!stripe) {
      return this.validationError("Stripe is not configured — set STRIPE_SECRET_KEY and price IDs.", null);
    }

    const priceId = resolveStripePriceId(this.deps.env, parsed.data.planId);
    if (!priceId) {
      return this.validationError(
        `Stripe price not configured for ${parsed.data.planId} — set STRIPE_PRICE_${parsed.data.planId.toUpperCase()}.`,
        null,
      );
    }

    const billing = await getBillingRow(this.deps.getDb(), tenant);

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
    return this.success({ url: session.url, sessionId: session.id, checkoutMode: "stripe" }, null, 200);
  }

  async createSetupCheckout(req: Request): Promise<Response> {
    const mode = resolveCheckoutMode(this.deps.env);
    if (mode === "off") {
      return this.billingDisabledResponse();
    }

    const tenant = this.requireTenantUserId();
    if (tenant instanceof Response) return tenant;

    const origin = this.deps.env.clientOrigin.replace(/\/$/, "");

    if (mode === "razorpay") {
      return this.startRazorpayCheckout(req, {
        userId: tenant,
        description: "ExtractPilot workspace setup",
        amount: resolveChargeAmount("setup", this.deps.env.razorpay),
        notes: { purchaseType: "setup-onboarding", userId: tenant },
      });
    }

    if (mode === "demo") {
      return this.success(
        {
          url: `${origin}/dashboard/pricing?checkout=setup-success&mode=demo`,
          sessionId: `demo_setup_${Date.now()}`,
          checkoutMode: "demo",
        },
        "Setup request recorded (demo checkout).",
        200,
      );
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

    const billing = await getBillingRow(this.deps.getDb(), tenant);

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
    return this.success({ url: session.url, sessionId: session.id, checkoutMode: "stripe" }, null, 200);
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
    if (req.headers.get("x-razorpay-signature")) {
      return this.handleRazorpayWebhook(req);
    }

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

  private async startRazorpayCheckout(
    req: Request,
    input: {
      userId: string;
      description: string;
      amount: number;
      notes: Record<string, string>;
    },
  ): Promise<Response> {
    const razorpay = this.deps.env.razorpay;
    if (!razorpay.keyId || !razorpay.keySecret) {
      return this.validationError("Razorpay is not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.", null);
    }
    if (input.amount < 100) {
      return this.validationError("Razorpay amount must be at least 100 minor units.", null);
    }

    const user = await findUserById(this.deps.getDb(), input.userId);
    if (!user) {
      return this.validationError("Sign in required to manage billing.", null);
    }

    const callbackUrl = `${resolveApiPublicUrl(req, this.deps.env.auth.apiPublicUrl)}/api/v1/billing/razorpay/callback`;
    try {
      const link = await createPaymentLink(razorpay, {
        amount: input.amount,
        description: input.description,
        referenceId: `ep_${input.notes.planId ?? "setup"}_${Date.now().toString(36)}`,
        email: user.email,
        name: user.name,
        notes: input.notes,
        callbackUrl,
      });
      return this.success(
        { url: link.url, sessionId: link.id, checkoutMode: "razorpay" },
        null,
        200,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Razorpay checkout failed";
      return this.validationError(message, null);
    }
  }

  async razorpayCallback(req: Request): Promise<Response> {
    const origin = this.deps.env.clientOrigin.replace(/\/$/, "");
    const url = new URL(req.url);
    const paymentLinkId = url.searchParams.get("razorpay_payment_link_id") ?? "";
    const referenceId = url.searchParams.get("razorpay_payment_link_reference_id") ?? "";
    const status = url.searchParams.get("razorpay_payment_link_status") ?? "";
    const paymentId = url.searchParams.get("razorpay_payment_id") ?? "";
    const signature = url.searchParams.get("razorpay_signature") ?? "";
    const fail = (path: string) => Response.redirect(`${origin}${path}`, 302);

    const razorpay = this.deps.env.razorpay;
    if (!razorpay.keySecret || !paymentLinkId || !signature) {
      return fail("/dashboard/pricing?checkout=canceled");
    }
    const valid = verifyPaymentLinkCallback({
      keySecret: razorpay.keySecret,
      paymentLinkId,
      referenceId,
      status,
      paymentId,
      signature,
    });
    if (!valid || status !== "paid") {
      return fail("/dashboard/pricing?checkout=canceled");
    }

    try {
      const link = await fetchPaymentLink(razorpay, paymentLinkId);
      const notes = link.notes ?? {};
      const userId = notes.userId;
      const planId = paidPlanFromNotes(notes);
      if (userId && planId && link.status === "paid") {
        await upsertWorkspaceBilling(this.deps.getDb(), userId, {
          planId,
          subscriptionStatus: "active",
        });
        await this.clearPlansCache(userId, planId);
        return fail("/dashboard/pricing?checkout=success&mode=razorpay");
      }
      if (userId && notes.purchaseType === "setup-onboarding" && link.status === "paid") {
        return fail("/dashboard/pricing?checkout=setup-success&mode=razorpay");
      }
    } catch {
      return fail("/dashboard/pricing?checkout=canceled");
    }
    return fail("/dashboard/pricing?checkout=canceled");
  }

  private async handleRazorpayWebhook(req: Request): Promise<Response> {
    const secret = this.deps.env.razorpay.webhookSecret;
    const signature = req.headers.get("x-razorpay-signature") ?? "";
    if (!secret) {
      return Response.json({ success: false, message: "Razorpay webhook is not configured" }, { status: 503 });
    }
    const rawBody = await req.text();
    if (!verifyWebhookSignature(secret, rawBody, signature)) {
      return Response.json({ success: false, message: "Invalid signature" }, { status: 400 });
    }

    let event: {
      event?: string;
      payload?: { payment_link?: { entity?: { notes?: Record<string, string>; status?: string } } };
    };
    try {
      event = JSON.parse(rawBody) as typeof event;
    } catch {
      return Response.json({ success: false, message: "Invalid webhook body" }, { status: 400 });
    }
    if (event.event === "payment_link.paid") {
      const entity = event.payload?.payment_link?.entity;
      const notes = entity?.notes;
      const userId = notes?.userId;
      const planId = paidPlanFromNotes(notes);
      if (userId && planId) {
        await upsertWorkspaceBilling(this.deps.getDb(), userId, {
          planId,
          subscriptionStatus: "active",
        });
        await this.clearPlansCache(userId, planId);
      }
    }
    return Response.json({ received: true });
  }

  async status(): Promise<Response> {
    const tenant = this.requireTenantUserId();
    if (tenant instanceof Response) return tenant;

    const planId = await getActivePlanId(this.deps.getDb(), this.deps.env, tenant);
    const billing = await getBillingRow(this.deps.getDb(), tenant);

    const checkoutMode = resolveCheckoutMode(this.deps.env);
    return this.success(
      {
        activePlanId: planId,
        billingEnabled: checkoutMode !== "off",
        checkoutMode,
        stripeReady: stripeCheckoutReady(this.deps.env),
        razorpayReady: resolveCheckoutMode(this.deps.env) === "razorpay",
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
  if (path === "/api/v1/billing/razorpay/callback" && req.method === "GET") {
    return handler.razorpayCallback(req);
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
