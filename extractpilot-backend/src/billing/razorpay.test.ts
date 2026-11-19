import { describe, expect, test } from "bun:test";
import {
  razorpaySignaturesMatch,
  resolveChargeAmount,
  signRazorpayPayload,
  verifyPaymentLinkCallback,
  verifyWebhookSignature,
} from "./razorpay";

describe("razorpay", () => {
  test("charges the listed price in minor units when no override is set", () => {
    const config = { amountStandard: null, amountPremium: null, amountEnterprise: null, amountSetup: null };
    expect(resolveChargeAmount("standard", config)).toBe(2499);
    expect(resolveChargeAmount("setup", config)).toBe(9999);
  });

  test("uses an explicit minor-unit override", () => {
    const config = { amountStandard: 249900, amountPremium: null, amountEnterprise: null, amountSetup: null };
    expect(resolveChargeAmount("standard", config)).toBe(249900);
  });

  test("verifies a payment-link callback signature", () => {
    const secret = "rzp_test_secret";
    const fields = {
      paymentLinkId: "plink_123",
      referenceId: "ep_standard_1",
      status: "paid",
      paymentId: "pay_123",
    };
    const signature = signRazorpayPayload(secret, Object.values(fields).join("|"));
    expect(verifyPaymentLinkCallback({ keySecret: secret, ...fields, signature })).toBe(true);
    expect(verifyPaymentLinkCallback({ keySecret: secret, ...fields, signature: "nope" })).toBe(false);
  });

  test("verifies a webhook body signature", () => {
    const secret = "whsec_test";
    const body = '{"event":"payment_link.paid"}';
    const signature = signRazorpayPayload(secret, body);
    expect(verifyWebhookSignature(secret, body, signature)).toBe(true);
    expect(razorpaySignaturesMatch(signature, signature.slice(0, -1) + "0")).toBe(false);
  });
});
