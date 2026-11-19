"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { BETA_ACCESS_NOTICE, FIRST_MONTH_DISCOUNT_LABEL, type PlanId } from "@repo/config/plans";
import { restClient } from "@/lib/restClient";
import { LinkButton } from "@/components/ui/LinkButton";
import { Button } from "@/components/ui/Button";
import { SetupOfferCard } from "@/components/pricing/SetupOfferCard";
import { PlanPrice } from "@/components/pricing/PlanPrice";
import { LogoMark, Wordmark } from "@/components/brand/LogoMark";
import { useAuth } from "@/providers/AuthProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type PlanCard = {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthlyUsd: number | null;
  features: string[];
  popular?: boolean;
};

const HIGHLIGHTS = [
  { label: "Basic is free", detail: "Standard $24.99" },
  { label: "GPT, Sonnet, Fable", detail: "current models" },
  { label: "Scheduled cron jobs", detail: "on paid plans" },
  { label: "Tools and summaries", detail: "Slack, CRM, webhooks" },
];

export default function PricingPage() {
  const { user, loading: authLoading } = useAuth();
  const signedIn = Boolean(user);
  const [plans, setPlans] = useState<PlanCard[]>([]);
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<"razorpay" | "stripe" | "demo" | "off">("off");
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const headRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = headRef.current;
    if (!el) return;
    gsap.fromTo(el.children, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.07, ease: "power2.out" });
  }, []);

  useEffect(() => {
    void restClient.plans.list().then((res) => {
      if (res.success) {
        setPlans(res.data.plans as PlanCard[]);
        setBillingEnabled(Boolean(res.data.billingEnabled));
        setCheckoutMode(res.data.checkoutMode ?? (res.data.billingEnabled ? "razorpay" : "off"));
      }
    });
  }, []);

  const startSetupCheckout = useCallback(async () => {
    if (!signedIn) {
      window.location.href = "/login?next=/dashboard/pricing";
      return;
    }
    setSetupLoading(true);
    setCheckoutError(null);
    const res = await restClient.billing.checkoutSetup();
    setSetupLoading(false);
    if (res.success && res.data.url) {
      window.location.href = res.data.url;
      return;
    }
    setCheckoutError(res.success ? "Checkout unavailable right now." : res.message);
  }, [signedIn]);

  const startSubscriptionCheckout = useCallback(
    async (planId: "standard" | "premium" | "enterprise") => {
      if (!signedIn) {
        window.location.href = `/login?next=${encodeURIComponent("/dashboard/pricing")}`;
        return;
      }
      setCheckoutPlanId(planId);
      setCheckoutError(null);
      const res = await restClient.billing.checkout(planId);
      setCheckoutPlanId(null);
      if (res.success && res.data.url) {
        window.location.href = res.data.url;
        return;
      }
      setCheckoutError(res.success ? "Checkout unavailable right now." : res.message);
    },
    [signedIn],
  );

  const paidPlans = plans.filter((p) => p.id !== "free");
  const freePlan = plans.find((p) => p.id === "free");
  const workspaceHref = "/dashboard/pricing";
  const startHref = signedIn ? "/dashboard" : "/login?next=/dashboard";
  const docsHref = "/docs";

  return (
    <div className="marketing-shell">
      <header className="marketing-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark size="sm" />
            <Wordmark subtitle="Pricing" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LinkButton href={docsHref} variant="ghost" size="sm">
              Docs
            </LinkButton>
            {authLoading ? null : signedIn ? (
              <LinkButton href="/dashboard" variant="primary" size="sm">
                Open workspace
              </LinkButton>
            ) : (
              <LinkButton href="/login?next=/dashboard" variant="primary" size="sm">
                Sign in
              </LinkButton>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
        <div ref={headRef} className="mx-auto max-w-3xl text-center">
          <p className="section-label-accent">Simple pricing</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-night sm:text-5xl">
            Start free. Scale when volume grows.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-muted">
            Write requirements, connect mailboxes, Extract Now. Same product on every plan — limits and AI models scale
            up for sales, support, ecommerce, and ops.
          </p>
          {signedIn ? (
            <p className="mt-5 inline-flex rounded-2xl border border-moss/25 bg-moss/10 px-4 py-2.5 text-[14px] text-night">
              Signed in as <strong className="ml-1">{user?.email}</strong> — upgrades stay in your session.
            </p>
          ) : null}
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map((item) => (
            <div key={item.label} className="stat-tile text-center">
              <p className="relative text-[15px] font-bold text-night">{item.label}</p>
              <p className="relative mt-1 text-[13px] text-ink-muted">{item.detail}</p>
            </div>
          ))}
        </div>

        {billingEnabled ? (
          <p className="mt-6 text-center text-[14px] font-medium text-accent">{FIRST_MONTH_DISCOUNT_LABEL}</p>
        ) : (
          <p className="mx-auto mt-6 max-w-2xl rounded-2xl border border-ink/10 bg-paper-elevated px-4 py-3 text-center text-[14px] text-ink-muted">
            Checkout is off in this environment — use the free console today. {BETA_ACCESS_NOTICE}
          </p>
        )}
        {checkoutError ? (
          <p className="mx-auto mt-3 max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-[14px] text-rose-900">
            {checkoutError}
          </p>
        ) : null}

        <div className="mt-12 grid gap-5 lg:grid-cols-4">
          {freePlan ? (
            <article className="saas-card flex flex-col p-6">
              <span className="pill mb-4 !py-1">Free</span>
              <h2 className="text-xl font-bold text-night">{freePlan.name}</h2>
              <PlanPrice priceMonthlyUsd={freePlan.priceMonthlyUsd} />
              <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{freePlan.tagline}</p>
              <ul className="mt-6 flex-1 space-y-2.5 text-[14px] text-ink-muted">
                {freePlan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-accent">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <LinkButton href={startHref} variant="accent" className="mt-8 w-full">
                {signedIn ? "Open workspace" : "Start free"}
              </LinkButton>
            </article>
          ) : null}

          {paidPlans.map((plan) => (
            <article
              key={plan.id}
              className={`saas-card relative flex flex-col p-6 ${
                plan.popular ? "ring-2 ring-accent/45 lg:-translate-y-1 lg:shadow-ledger-lg" : ""
              }`}
            >
              {plan.popular ? (
                <span className="pill-accent mb-4 !py-1">Most popular</span>
              ) : (
                <span className="mb-4 h-7" aria-hidden />
              )}
              <h2 className="text-xl font-bold text-night">{plan.name}</h2>
              <PlanPrice priceMonthlyUsd={plan.priceMonthlyUsd} />
              <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{plan.tagline}</p>
              <ul className="mt-6 flex-1 space-y-2.5 text-[14px] text-ink-muted">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-accent">✓</span>
                    <span>{f}</span>
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
                  {checkoutPlanId === plan.id
                    ? "Working…"
                    : signedIn
                      ? checkoutMode === "demo"
                        ? `Activate ${plan.name}`
                        : checkoutMode === "razorpay"
                          ? `Pay with Razorpay`
                          : `Upgrade — ${plan.name}`
                      : checkoutMode === "razorpay"
                        ? `Pay with Razorpay`
                        : `Get ${plan.name}`}
                </Button>
              ) : (
                <LinkButton
                  href={signedIn ? workspaceHref : `/login?next=${encodeURIComponent(workspaceHref)}`}
                  variant={plan.popular ? "accent" : "secondary"}
                  className="mt-8 w-full"
                >
                  {signedIn ? "Manage in workspace" : "Start free first"}
                </LinkButton>
              )}
            </article>
          ))}
        </div>

        <section className="mt-16">
          <div className="mb-4 max-w-xl">
            <h2 className="text-xl font-bold text-night">Need help going live?</h2>
            <p className="mt-1 text-[15px] text-ink-muted">
              Optional one-time setup — not required if you&apos;re comfortable in the console.
            </p>
          </div>
          <SetupOfferCard
            billingEnabled={billingEnabled}
            onCheckout={billingEnabled ? startSetupCheckout : undefined}
            checkoutLoading={setupLoading}
            fallbackHref={signedIn ? "/dashboard/workflow?step=1" : "/login?next=/dashboard"}
            fallbackLabel={signedIn ? "Continue setup in workspace" : "Start free"}
          />
        </section>
      </main>
    </div>
  );
}
