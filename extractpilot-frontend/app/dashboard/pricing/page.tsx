"use client";

import { useEffect, useState } from "react";
import { BETA_DISCLAIMER, BETA_LAUNCH_LABEL } from "@repo/config/plans";
import { restClient } from "@/lib/restClient";
import { emailQuotaLabel, formatQuotaUsage } from "@/lib/formatUsage";
import { Panel } from "@/components/ui/Panel";
import { LinkButton } from "@/components/ui/LinkButton";
import { BetaNoticePanel } from "@/components/layout/BetaBanner";

export default function DashboardPricingPage() {
  const [plans, setPlans] = useState<
    Array<{
      id: string;
      name: string;
      tagline: string;
      priceMonthlyUsd: number | null;
      features: string[];
    }>
  >([]);
  const [activePlanId, setActivePlanId] = useState("free");
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
        setPlans(plansRes.data.plans);
        setActivePlanId(plansRes.data.activePlanId);
      }
      if (usageRes.success) setUsage(usageRes.data);
    });
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="section-label">Billing</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-slate-950">Plans & usage</h1>
        <p className="mt-2 text-slate-600">{BETA_DISCLAIMER}</p>
      </div>

      <BetaNoticePanel />

      {usage ? (
        <Panel title={usage.unlimitedQuota ? "Current usage (unlimited beta access)" : "Current usage (beta free tier)"}>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">{usage ? emailQuotaLabel(usage.emailQuotaPeriod) : "Email quota"}</dt>
              <dd className="font-semibold">
                {formatQuotaUsage(usage.emailsUsed, usage.emailsLimit, usage.unlimitedQuota)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Extractions today</dt>
              <dd className="font-semibold">
                {formatQuotaUsage(usage.extractionsToday, usage.extractionsLimitDay, usage.unlimitedQuota)}
              </dd>
            </div>
          </dl>
        </Panel>
      ) : null}

      <p className="text-center text-sm font-medium text-slate-500">
        Upgrades disabled until {BETA_LAUNCH_LABEL.toLowerCase()}
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className={`glass-panel flex flex-col p-6 ${plan.id === activePlanId ? "ring-2 ring-blue-600" : ""}`}
          >
            {plan.id === activePlanId ? (
              <span className="mb-3 w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                Your beta plan
              </span>
            ) : plan.id !== "free" ? (
              <span className="mb-3 w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                At launch
              </span>
            ) : null}
            <h2 className="font-display text-xl font-bold">{plan.name}</h2>
            <p className="mt-2 text-sm text-slate-600">{plan.tagline}</p>
            <ul className="mt-6 flex-1 space-y-2 text-sm text-slate-700">
              {plan.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            {plan.id === "free" ? (
              <LinkButton href="/dashboard/workflow?step=1" variant="accent" className="mt-8 w-full">
                Continue beta testing
              </LinkButton>
            ) : (
              <p className="mt-8 text-center text-xs text-slate-500">
                Paid checkout disabled during closed beta
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
