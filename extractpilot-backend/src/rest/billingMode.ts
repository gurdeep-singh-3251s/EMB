import type { Env } from "@repo/config";

export type CheckoutMode = "stripe" | "demo" | "off";

export function stripeCheckoutReady(env: Env): boolean {
  return env.enableBilling && Boolean(env.stripe.secretKey);
}

export function resolveCheckoutMode(env: Env): CheckoutMode {
  if (stripeCheckoutReady(env)) return "stripe";
  if (env.enableDemoBilling) return "demo";
  return "off";
}

export function checkoutAvailable(env: Env): boolean {
  return resolveCheckoutMode(env) !== "off";
}
