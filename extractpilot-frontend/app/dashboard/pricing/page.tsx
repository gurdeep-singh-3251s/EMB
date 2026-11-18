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

  const [plans, setPlans] = useState<PlanCard[]>([]);
  const [activePlanId, setActivePlanId] = useState("free");
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [usage, setUsage] = useState<{
    emailsUsed: number;
    emailsLimit: number | null;
    emailQuotaPeriod: "day" | "week";
    extractionsToday: number;
    extractionsLimitDay: number | null;
    unlimitedQuota?: boolean;
  } | null>(null);

  useEffect(() => {
    void Promise.all([restClient.plans.list(), restClient.usage.get()]).then(([plansRes, usageRes]) => {
      if (plansRes.success) {
        setPlans(plansRes.data.plans as PlanCard[]);
        setActivePlanId(plansRes.data.activePlanId);
        setBillingEnabled(Boolean(plansRes.data.billingEnabled));
      }
      if (usageRes.success) setUsage(usageRes.data);
    });
  }, []);

  const startSubscriptionCheckout = useCallback(async (planId: "standard" | "premium" | "enterprise") => {
    setCheckoutPlanId(planId);
    const res = await restClient.billing.checkout(planId);
    setCheckoutPlanId(null);
    if (res.success && res.data.url) {
      window.location.href = res.data.url;
    }
  }, []);

  const startSetupCheckout = useCallback(async () => {
    setSetupLoading(true);
    const res = await restClient.billing.checkoutSetup();
    setSetupLoading(false);
    if (res.success && res.data.url) {
      window.location.href = res.data.url;
    }
  }, []);

  const openPortal = useCallback(async () => {
    const res = await restClient.billing.portal();
    if (res.success && res.data.url) {
      window.location.href = res.data.url;
    }
  }, []);

  const paidPlans = plans.filter((p) => p.id !== "free");
  const freePlan = plans.find((p) => p.id === "free");

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="section-label">Billing</p>
        <h1 className="page-title !mt-2">Plans & usage</h1>
        <p className="page-lede">
          Start free, then scale email volume and AI models. {BETA_DISCLAIMER}
        </p>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-muted">{BETA_ACCESS_NOTICE}</p>
      </div>

      {checkoutNotice ? (
        <Panel title="Checkout">
          <p className="text-sm text-ink">
            {checkoutNotice === "success"
              ? "Subscription updated — thanks! It may take a moment for your plan to refresh."
              : checkoutNotice === "setup-success"
                ? "Setup payment received — our team will reach out to schedule your onboarding."
                : "Checkout canceled — no charges were made."}
          </p>
        </Panel>
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
          {billingEnabled ? (
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => void openPortal()}>
              Manage subscription
            </Button>
          ) : null}
        </Panel>
      ) : null}

      <h2 className="text-lg font-bold text-night">Monthly plans</h2>
      <p className="mt-1 text-[15px] text-ink-muted">All prices in USD, billed monthly. Same product on every tier — limits and models scale up.</p>

      <div className="grid gap-6 lg:grid-cols-4">
        {freePlan ? (
          <article
            className={`glass-panel flex flex-col p-6 ${freePlan.id === activePlanId ? "ring-2 ring-rust" : ""}`}
          >
            {freePlan.id === activePlanId ? (
              <span className="mb-3 w-fit rounded-full bg-rust/10 px-3 py-1 text-xs font-semibold text-rust">
                Current plan
              </span>
            ) : (
              <span className="mb-3 h-6" aria-hidden />
            )}
            <h2 className="font-display text-xl font-bold">{freePlan.name}</h2>
            <PlanPrice priceMonthlyUsd={freePlan.priceMonthlyUsd} />
            <p className="mt-2 text-sm text-ink-muted">{freePlan.tagline}</p>
            <ul className="mt-6 flex-1 space-y-2 text-sm text-ink">
              {freePlan.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
          </article>
        ) : null}

        {paidPlans.map((plan) => (
          <article
            key={plan.id}
            className={`glass-panel flex flex-col p-6 ${
              plan.id === activePlanId ? "ring-2 ring-rust" : plan.popular ? "ring-2 ring-ink/20" : ""
            }`}
          >
            {plan.id === activePlanId ? (
              <span className="mb-3 w-fit rounded-full bg-rust/10 px-3 py-1 text-xs font-semibold text-rust">
                Current plan
              </span>
            ) : plan.popular ? (
              <span className="mb-3 w-fit rounded-full bg-rust px-3 py-1 text-xs font-semibold text-paper">
                Most popular
              </span>
            ) : (
              <span className="mb-3 h-6" aria-hidden />
            )}
            <h2 className="font-display text-xl font-bold">{plan.name}</h2>
            <PlanPrice priceMonthlyUsd={plan.priceMonthlyUsd} />
            <p className="mt-2 text-sm text-ink-muted">{plan.tagline}</p>
            <ul className="mt-6 flex-1 space-y-2 text-sm text-ink">
              {plan.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            {billingEnabled && plan.id !== activePlanId ? (
              <Button
                variant={plan.popular ? "accent" : "secondary"}
                className="mt-8 w-full"
                disabled={checkoutPlanId === plan.id}
                onClick={() =>
                  void startSubscriptionCheckout(plan.id as "standard" | "premium" | "enterprise")
                }
              >
                {checkoutPlanId === plan.id ? "Redirecting…" : `Upgrade`}
              </Button>
            ) : plan.id === activePlanId ? (
              <p className="mt-8 text-center text-xs text-ink-muted">Active subscription</p>
            ) : (
              <p className="mt-8 text-center text-xs text-ink-muted">Enable billing on API for checkout</p>
            )}
          </article>
        ))}
      </div>

      <div className="pt-4">
        <h2 className="text-lg font-bold text-night">Optional guided setup</h2>
        <p className="mt-1 text-[15px] text-ink-muted">
          One-time onboarding call — not required if you&apos;re comfortable in the console.
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

      <p className="text-[13px] text-ink-muted">
        Shareable marketing page:{" "}
        <LinkButton href="/pricing" variant="ghost" size="sm" className="inline-flex !px-1">
          /pricing
        </LinkButton>{" "}
        — if you&apos;re already signed in, it keeps you in this workspace.
      </p>
    </div>
  );
}
