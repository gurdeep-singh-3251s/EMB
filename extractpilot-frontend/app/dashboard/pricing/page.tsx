"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BETA_ACCESS_NOTICE, BETA_DISCLAIMER, formatUsdPrice, type PlanId } from "@repo/config/plans";
import { restClient } from "@/lib/restClient";
import { emailQuotaLabel, formatQuotaUsage } from "@/lib/formatUsage";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

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
        <h1 className="page-title">Plans</h1>
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

      <ul className="border-t border-ink/15">
        {freePlan ? (
          <li className="grid items-baseline gap-2 border-b border-ink/15 py-4 sm:grid-cols-[12rem_1fr_auto]">
            <span className="font-semibold text-night">
              {freePlan.name}
              {freePlan.id === activePlanId ? <span className="ml-2 font-mono text-[12px] text-ink-faint">Current</span> : null}
            </span>
            <span className="text-[14px] text-ink-muted">{freePlan.features.slice(0, 2).join(" · ")}</span>
            <span className="font-display text-night">{formatUsdPrice(freePlan.priceMonthlyUsd, { suffix: "" })}</span>
          </li>
        ) : null}
        {paidPlans.map((plan) => (
          <li key={plan.id} className="border-b border-ink/15">
            <Link
              href={billingEnabled && plan.id !== activePlanId ? `/checkout?plan=${plan.id}` : "/dashboard/pricing"}
              className="grid items-baseline gap-2 py-4 sm:grid-cols-[12rem_1fr_auto]"
            >
              <span className="font-semibold text-night">
                {plan.name}
                {plan.id === activePlanId ? <span className="ml-2 font-mono text-[12px] text-ink-faint">Current</span> : null}
              </span>
              <span className="text-[14px] text-ink-muted">{plan.features.slice(0, 2).join(" · ")}</span>
              <span className="font-display text-night">{formatUsdPrice(plan.priceMonthlyUsd)}</span>
            </Link>
          </li>
        ))}
        <li className="border-b border-ink/15">
          <Link href={billingEnabled ? "/checkout?plan=setup" : "/dashboard/workflow?step=1"} className="grid items-baseline gap-2 py-4 sm:grid-cols-[12rem_1fr_auto]">
            <span className="font-semibold text-night">Guided setup</span>
            <span className="text-[14px] text-ink-muted">One sitting. Connect, write the schema, run a live extract.</span>
            <span className="font-display text-night">$99.99</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
