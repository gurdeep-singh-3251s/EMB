"use client";

import { useCallback, useEffect, useState } from "react";
import { BETA_ACCESS_NOTICE, BETA_DISCLAIMER, type PlanId } from "@repo/config/plans";
import { restClient } from "@/lib/restClient";
import { emailQuotaLabel, formatQuotaUsage } from "@/lib/formatUsage";
import { Panel } from "@/components/ui/Panel";
import { LinkButton } from "@/components/ui/LinkButton";
import { Button } from "@/components/ui/Button";
import { SetupOfferCard } from "@/components/pricing/SetupOfferCard";
import { PlanPrice } from "@/components/pricing/PlanPrice";
import { useSearchParams } from "next/navigation";

type PlanCard = {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthlyUsd: number | null;
  features: string[];
  popular?: boolean;
};

export default function DashboardPricingPage() {
  const searchParams = useSearchParams();
  const checkoutNotice = searchParams.get("checkout");
  const checkoutModeParam = searchParams.get("mode");

  const [plans, setPlans] = useState<PlanCard[]>([]);
  const [activePlanId, setActivePlanId] = useState("free");
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<"razorpay" | "stripe" | "demo" | "off">("off");
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{
    emailsUsed: number;
    emailsLimit: number | null;
    emailQuotaPeriod: "day" | "week";
    extractionsToday: number;
    extractionsLimitDay: number | null;
    unlimitedQuota?: boolean;
  } | null>(null);

  const refresh = useCallback(async () => {
    const [plansRes, usageRes] = await Promise.all([restClient.plans.list(), restClient.usage.get()]);
    if (plansRes.success) {
      setPlans(plansRes.data.plans as PlanCard[]);
      setActivePlanId(plansRes.data.activePlanId);
      setBillingEnabled(Boolean(plansRes.data.billingEnabled));
      const mode = plansRes.data.checkoutMode;
      setCheckoutMode(mode ?? (plansRes.data.billingEnabled ? "razorpay" : "off"));
    }
    if (usageRes.success) setUsage(usageRes.data);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startSubscriptionCheckout = useCallback(
    async (planId: "standard" | "premium" | "enterprise") => {
      setCheckoutPlanId(planId);
      setActionError(null);
      const res = await restClient.billing.checkout(planId);
      setCheckoutPlanId(null);
      if (res.success && res.data.url) {
        window.location.href = res.data.url;
        return;
      }
      setActionError(res.success ? "Checkout did not return a URL." : res.message);
    },
    [],
  );

  const startSetupCheckout = useCallback(async () => {
    setSetupLoading(true);
    setActionError(null);
    const res = await restClient.billing.checkoutSetup();
    setSetupLoading(false);
    if (res.success && res.data.url) {
      window.location.href = res.data.url;
      return;
    }
    setActionError(res.success ? "Checkout did not return a URL." : res.message);
  }, []);

  const openPortal = useCallback(async () => {
    setActionError(null);
    const res = await restClient.billing.portal();
    if (res.success && res.data.url) {
      window.location.href = res.data.url;
      return;
    }
    setActionError(res.success ? "Portal unavailable." : res.message);
  }, []);

  const paidPlans = plans.filter((p) => p.id !== "free");
  const freePlan = plans.find((p) => p.id === "free");

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="section-label">Billing</p>
        <h1 className="page-title !mt-2">Plans & usage</h1>
        <p className="page-lede">
          Start free, then upgrade when you need more volume and AI models. {BETA_DISCLAIMER}
        </p>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-muted">{BETA_ACCESS_NOTICE}</p>
      </div>

      {checkoutMode === "demo" ? (
        <div className="rounded-2xl border border-accent/25 bg-accent-soft/60 px-4 py-3 text-[14px] text-night">
          <strong className="font-semibold">Demo checkout is on</strong> — Upgrade activates the plan in this workspace
          instantly (Stripe is not connected yet). Perfect for live demos.
        </div>
      ) : null}

      {checkoutNotice ? (
        <Panel title="Checkout">
          <p className="text-sm text-ink">
            {checkoutNotice === "success"
              ? checkoutModeParam === "demo"
                ? "Plan activated for this workspace. Limits and models refresh with your new tier."
                : "Subscription updated — thanks! It may take a moment for your plan to refresh."
              : checkoutNotice === "setup-success"
                ? checkoutModeParam === "demo"
                  ? "Setup request recorded — continue in Get started, or book a real onboarding when Stripe is live."
                  : "Setup payment received — our team will reach out to schedule your onboarding."
                : "Checkout canceled — no charges were made."}
          </p>
        </Panel>
      ) : null}

      {actionError ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-900">{actionError}</p>
      ) : null}

      {usage ? (
        <Panel title={usage.unlimitedQuota ? "Current usage (promotional unlimited)" : "Current usage"}>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">{emailQuotaLabel(usage.emailQuotaPeriod)}</dt>
              <dd className="font-semibold">
                {formatQuotaUsage(usage.emailsUsed, usage.emailsLimit, usage.unlimitedQuota)}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Extractions today</dt>
              <dd className="font-semibold">
                {formatQuotaUsage(usage.extractionsToday, usage.extractionsLimitDay, usage.unlimitedQuota)}
              </dd>
            </div>
          </dl>
          {checkoutMode === "stripe" ? (
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => void openPortal()}>
              Manage subscription
            </Button>
          ) : null}
        </Panel>
      ) : null}

      <div>
        <h2 className="text-lg font-bold text-night">Monthly plans</h2>
        <p className="mt-1 text-[15px] text-ink-muted">
          All prices in USD.
          {checkoutMode === "razorpay"
            ? " Upgrade opens Razorpay (UPI, cards, netbanking)."
            : checkoutMode === "demo"
              ? " Click Upgrade to switch tiers in this demo workspace."
              : " Click Upgrade to switch tiers."}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-4">
        {freePlan ? (
          <article
            className={`saas-card flex flex-col p-6 ${freePlan.id === activePlanId ? "ring-2 ring-accent/40" : ""}`}
          >
            {freePlan.id === activePlanId ? (
              <span className="pill-accent mb-4 !py-1">Current plan</span>
            ) : (
              <span className="mb-4 h-7" aria-hidden />
            )}
            <h2 className="text-xl font-bold text-night">{freePlan.name}</h2>
            <PlanPrice priceMonthlyUsd={freePlan.priceMonthlyUsd} />
            <p className="mt-2 text-[14px] text-ink-muted">{freePlan.tagline}</p>
            <ul className="mt-6 flex-1 space-y-2 text-[14px] text-ink-muted">
              {freePlan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-accent">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            {freePlan.id === activePlanId ? (
              <p className="mt-8 text-center text-[13px] font-medium text-ink-muted">You&apos;re on {freePlan.name}</p>
            ) : (
              <LinkButton href="/dashboard/workflow?step=1" variant="secondary" className="mt-8 w-full">
                Continue free setup
              </LinkButton>
            )}
          </article>
        ) : null}

        {paidPlans.map((plan) => (
          <article
            key={plan.id}
            className={`saas-card flex flex-col p-6 ${
              plan.id === activePlanId
                ? "ring-2 ring-accent/40"
                : plan.popular
                  ? "ring-2 ring-accent/25 lg:-translate-y-0.5"
                  : ""
            }`}
          >
            {plan.id === activePlanId ? (
              <span className="pill-accent mb-4 !py-1">Current plan</span>
            ) : plan.popular ? (
              <span className="pill-accent mb-4 !py-1">Most popular</span>
            ) : (
              <span className="mb-4 h-7" aria-hidden />
            )}
            <h2 className="text-xl font-bold text-night">{plan.name}</h2>
            <PlanPrice priceMonthlyUsd={plan.priceMonthlyUsd} />
            <p className="mt-2 text-[14px] text-ink-muted">{plan.tagline}</p>
            <ul className="mt-6 flex-1 space-y-2 text-[14px] text-ink-muted">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-accent">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            {plan.id === activePlanId ? (
              <p className="mt-8 text-center text-[13px] font-medium text-moss">Active</p>
            ) : billingEnabled ? (
              <Button
                variant={plan.popular ? "accent" : "secondary"}
                className="mt-8 w-full"
                disabled={checkoutPlanId === plan.id}
                onClick={() => void startSubscriptionCheckout(plan.id as "standard" | "premium" | "enterprise")}
              >
                {checkoutPlanId === plan.id
                  ? "Working…"
                  : checkoutMode === "demo"
                    ? `Activate ${plan.name}`
                    : checkoutMode === "razorpay"
                      ? "Pay with Razorpay"
                      : `Upgrade to ${plan.name}`}
              </Button>
            ) : (
              <p className="mt-8 text-center text-[13px] text-ink-muted">
                Checkout unavailable — contact support to enable billing.
              </p>
            )}
          </article>
        ))}
      </div>

      <div className="pt-2">
        <h2 className="text-lg font-bold text-night">Optional guided setup</h2>
        <p className="mt-1 text-[15px] text-ink-muted">
          One-time onboarding — not required if you&apos;re comfortable in the console.
        </p>
        <SetupOfferCard
          billingEnabled={billingEnabled}
          onCheckout={billingEnabled ? startSetupCheckout : undefined}
          checkoutLoading={setupLoading}
          className="mt-4"
          fallbackHref="/dashboard/workflow?step=1"
          fallbackLabel="Continue free setup"
        />
      </div>
    </div>
  );
}
