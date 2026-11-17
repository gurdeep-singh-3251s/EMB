"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { BETA_ACCESS_NOTICE, FIRST_MONTH_DISCOUNT_LABEL, type PlanId } from "@repo/config/plans";
import { restClient } from "@/lib/restClient";
import { LinkButton } from "@/components/ui/LinkButton";
import { Button } from "@/components/ui/Button";
import { SetupOfferCard } from "@/components/pricing/SetupOfferCard";
import { PlanPrice } from "@/components/pricing/PlanPrice";
import { LogoMark, Wordmark } from "@/components/brand/LogoMark";

type PlanCard = {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthlyUsd: number | null;
  features: string[];
  popular?: boolean;
};

export default function PricingPage() {
  const [plans, setPlans] = useState<PlanCard[]>([]);
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const headRefBinding = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = headRefBinding.current;
    if (!el) return;
    gsap.fromTo(el.children, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power2.out" });
  }, []);

  useEffect(() => {
    void restClient.plans.list().then((res) => {
      if (res.success) {
        setPlans(res.data.plans as PlanCard[]);
        setBillingEnabled(Boolean(res.data.billingEnabled));
      }
    });
  }, []);

  const startSetupCheckout = useCallback(async () => {
    setSetupLoading(true);
    const res = await restClient.billing.checkoutSetup();
    setSetupLoading(false);
    if (res.success && res.data.url) {
      window.location.href = res.data.url;
    }
  }, []);

  const startSubscriptionCheckout = useCallback(async (planId: "standard" | "premium" | "enterprise") => {
    setCheckoutPlanId(planId);
    const res = await restClient.billing.checkout(planId);
    setCheckoutPlanId(null);
    if (res.success && res.data.url) {
      window.location.href = res.data.url;
    }
  }, []);

  const paidPlans = plans.filter((p) => p.id !== "free");
  const freePlan = plans.find((p) => p.id === "free");

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-ink/10 px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoMark size="sm" />
            <Wordmark />
          </div>
          <div className="flex gap-2">
            <LinkButton href="/" variant="ghost" size="sm">
              Home
            </LinkButton>
            <LinkButton href="/login" variant="primary" size="sm">
              Sign in
            </LinkButton>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-14 lg:py-16">
        <div ref={headRefBinding} className="max-w-2xl">
          <p className="section-label-accent">Pricing for brokerages</p>
          <h1 className="page-title">Plans that match how real-estate teams work.</h1>
          <p className="page-lede">
            Multi-Gmail workspaces, real-estate prompts, confidence scores, and 50+ AI models. Team includes{" "}
            <strong className="font-semibold text-night">1,000 emails / week</strong> and{" "}
            <strong className="font-semibold text-night">20+ AI models</strong>.
          </p>
          <ol className="mt-6 list-decimal space-y-2 pl-5 text-[15px] text-ink-muted">
            <li>
              <strong className="font-semibold text-night">Start free</strong> — demo on one agent inbox with RE prompts.
            </li>
            <li>
              <strong className="font-semibold text-night">Team at $29.99</strong> — 1,000 emails/week + 20+ models for
              managers.
            </li>
            <li>
              <strong className="font-semibold text-night">Connect your workspace</strong> — optional white-glove setup
              for the brokerage.
            </li>
          </ol>
          {billingEnabled ? (
            <p className="mt-4 text-[14px] font-medium text-accent">{FIRST_MONTH_DISCOUNT_LABEL}</p>
          ) : (
            <p className="mt-4 rounded-2xl border border-ink/10 bg-paper-elevated px-4 py-3 text-[14px] text-ink-muted">
              Checkout is off in this environment — use the <strong className="text-night">free console</strong> today.
              {` ${BETA_ACCESS_NOTICE}`}
            </p>
          )}
        </div>

        <div className="mt-14">
          <h2 className="text-lg font-bold text-night">Monthly plans</h2>
          <p className="mt-1 text-[15px] text-ink-muted">All prices in USD, billed monthly.</p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-4">
          {freePlan ? (
            <article className="saas-card flex flex-col p-6">
              <span className="pill mb-4 !py-1">Best to start</span>
              <h2 className="text-xl font-bold">{freePlan.name}</h2>
              <PlanPrice priceMonthlyUsd={freePlan.priceMonthlyUsd} />
              <p className="mt-2 text-[15px] text-ink-muted">{freePlan.tagline}</p>
              <ul className="mt-6 flex-1 space-y-2.5 text-[14px] text-ink-muted">
                {freePlan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-accent">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <LinkButton href="/login" variant="accent" className="mt-8 w-full">
                Start free
              </LinkButton>
            </article>
          ) : null}

          {paidPlans.map((plan) => (
            <article
              key={plan.id}
              className={`saas-card relative flex flex-col p-6 ${plan.popular ? "ring-2 ring-accent/40" : ""}`}
            >
              {plan.popular ? (
                <span className="pill-accent mb-4 !py-1">Most teams</span>
              ) : (
                <span className="mb-4 h-7" aria-hidden />
              )}
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <PlanPrice priceMonthlyUsd={plan.priceMonthlyUsd} />
              <p className="mt-2 text-[15px] text-ink-muted">{plan.tagline}</p>
              <ul className="mt-6 flex-1 space-y-2.5 text-[14px] text-ink-muted">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-accent">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {billingEnabled ? (
                <Button
                  variant={plan.popular ? "accent" : "secondary"}
                  className="mt-8 w-full"
                  disabled={checkoutPlanId === plan.id}
                  onClick={() =>
                    void startSubscriptionCheckout(plan.id as "standard" | "premium" | "enterprise")
                  }
                >
                  {checkoutPlanId === plan.id ? "Redirecting…" : `Subscribe — ${plan.name}`}
                </Button>
              ) : (
                <LinkButton href="/login" variant={plan.popular ? "accent" : "secondary"} className="mt-8 w-full">
                  Sign in to upgrade later
                </LinkButton>
              )}
            </article>
          ))}
        </div>

        <div className="mt-16">
          <h2 className="text-lg font-bold text-night">Need a hand getting live?</h2>
          <p className="mt-1 text-[15px] text-ink-muted">
            Optional one-time onboarding — not bundled into monthly plans.
          </p>
          <SetupOfferCard
            billingEnabled={billingEnabled}
            onCheckout={billingEnabled ? startSetupCheckout : undefined}
            checkoutLoading={setupLoading}
            className="mt-4"
          />
        </div>
      </main>
    </div>
  );
}
