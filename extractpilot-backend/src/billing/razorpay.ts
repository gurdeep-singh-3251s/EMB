import { createHmac, timingSafeEqual } from "node:crypto";
import { PLANS, SETUP_OFFER, type PlanId } from "@repo/config/plans";

const RAZORPAY_API = "https://api.razorpay.com/v1";

export type RazorpayConfig = {
  keyId: string;
  keySecret: string;
  currency: string;
  amountStandard: number | null;
  amountPremium: number | null;
  amountEnterprise: number | null;
  amountSetup: number | null;
};

export type RazorpayCheckout = {
  id: string;
  url: string;
};

type PaymentLinkEntity = {
  id?: string;
  status?: string;
  notes?: Record<string, string>;
  short_url?: string;
};

export function signRazorpayPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function razorpaySignaturesMatch(expected: string, provided: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

export function verifyPaymentLinkCallback(input: {
  keySecret: string;
  paymentLinkId: string;
  referenceId: string;
  status: string;
  paymentId: string;
  signature: string;
}): boolean {
  const payload = [input.paymentLinkId, input.referenceId, input.status, input.paymentId].join("|");
  const expected = signRazorpayPayload(input.keySecret, payload);
  return razorpaySignaturesMatch(expected, input.signature);
}

export function verifyWebhookSignature(secret: string, rawBody: string, signature: string): boolean {
  const expected = signRazorpayPayload(secret, rawBody);
  return razorpaySignaturesMatch(expected, signature);
}

/** Minor units (paise when currency is INR, cents when USD). */
export function resolveChargeAmount(
  kind: "standard" | "premium" | "enterprise" | "setup",
  config: Pick<RazorpayConfig, "amountStandard" | "amountPremium" | "amountEnterprise" | "amountSetup">,
): number {
  const override =
    kind === "standard"
      ? config.amountStandard
      : kind === "premium"
        ? config.amountPremium
        : kind === "enterprise"
          ? config.amountEnterprise
          : config.amountSetup;
  if (override && override > 0) return Math.round(override);
  const major = kind === "setup" ? SETUP_OFFER.priceUsd : (PLANS[kind].priceMonthlyUsd ?? 0);
  return Math.round(major * 100);
}

export async function createPaymentLink(
  config: RazorpayConfig,
  input: {
    amount: number;
    description: string;
    referenceId: string;
    email: string;
    name: string | null;
    notes: Record<string, string>;
    callbackUrl: string;
  },
): Promise<RazorpayCheckout> {
  const body = {
    amount: input.amount,
    currency: config.currency,
    accept_partial: false,
    description: input.description,
    reference_id: input.referenceId.slice(0, 40),
    customer: {
      email: input.email,
      ...(input.name ? { name: input.name } : {}),
    },
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: input.notes,
    callback_url: input.callbackUrl,
    callback_method: "get",
  };

  const res = await fetch(`${RAZORPAY_API}/payment_links`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(config),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await res.json()) as PaymentLinkEntity & { error?: { description?: string } };
  if (!res.ok || !payload.short_url || !payload.id) {
    throw new Error(payload.error?.description || "Razorpay could not start checkout");
  }
  return { id: payload.id, url: payload.short_url };
}

export async function fetchPaymentLink(config: RazorpayConfig, paymentLinkId: string): Promise<PaymentLinkEntity> {
  const res = await fetch(`${RAZORPAY_API}/payment_links/${encodeURIComponent(paymentLinkId)}`, {
    headers: { Authorization: basicAuth(config) },
  });
  const payload = (await res.json()) as PaymentLinkEntity & { error?: { description?: string } };
  if (!res.ok) {
    throw new Error(payload.error?.description || "Could not confirm the Razorpay payment");
  }
  return payload;
}

export function paidPlanFromNotes(notes: Record<string, string> | undefined): PlanId | null {
  const planId = notes?.planId;
  if (planId === "standard" || planId === "premium" || planId === "enterprise") return planId;
  return null;
}

function basicAuth(config: Pick<RazorpayConfig, "keyId" | "keySecret">): string {
  return `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}`;
}
