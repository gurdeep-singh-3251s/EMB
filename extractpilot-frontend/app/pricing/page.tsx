"use client";

import { useEffect, useState } from "react";
import { BETA_DISCLAIMER, BETA_LAUNCH_LABEL } from "@repo/config/plans";
import { restClient } from "@/lib/restClient";
import { LinkButton } from "@/components/ui/LinkButton";
import { BetaNoticePanel } from "@/components/layout/BetaBanner";

export default function PricingPage() {
  const [plans, setPlans] = useState<
    Array<{
      id: string;
      name: string;
      tagline: string;
      priceMonthlyUsd: number | null;
      features: string[];
    }>
  >([]);

  useEffect(() => {
    void restClient.plans.list().then((res) => {
      if (res.success) setPlans(res.data.plans);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[rgb(var(--surface-muted))]">
      <header className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <LinkButton href="/" variant="secondary" size="sm">
            ← Home
          </LinkButton>
          <LinkButton href="/dashboard" variant="accent" size="sm">
            Beta console
          </LinkButton>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <p className="section-label text-center">Closed beta · Plans</p>
        <h1 className="mt-3 text-center font-display text-4xl font-bold text-slate-950">Plans at launch</h1>
        <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">{BETA_DISCLAIMER}</p>

        <div className="mx-auto mt-8 max-w-2xl">
          <BetaNoticePanel />
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">{BETA_LAUNCH_LABEL} — paid upgrades not available yet</p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.id} className="glass-panel flex flex-col p-6">
              {plan.id !== "free" ? (
                <span className="mb-3 w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  At launch
                </span>
              ) : (
                <span className="mb-3 w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                  Beta access
                </span>
              )}
              <h2 className="font-display text-xl font-bold">{plan.name}</h2>
              <p className="mt-2 text-sm text-slate-600">{plan.tagline}</p>
              <ul className="mt-6 flex-1 space-y-2 text-sm text-slate-700">
                {plan.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              {plan.id === "free" ? (
                <LinkButton href="/dashboard/workflow?step=1" variant="accent" className="mt-8 w-full">
                  Request beta access
                </LinkButton>
              ) : (
                <p className="mt-8 text-center text-xs text-slate-500">Not available during closed beta</p>
              )}
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
