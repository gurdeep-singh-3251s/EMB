"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SETUP_OFFER, formatUsdPrice, type PlanId } from "@repo/config/plans";
import { restClient } from "@/lib/restClient";
import { useAuth } from "@/providers/AuthProvider";
import { LogoMark, Wordmark } from "@/components/brand/LogoMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/Button";

type PlanCard = {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthlyUsd: number | null;
  features: string[];
};

const PAID = new Set(["standard", "premium", "enterprise"]);

function CheckoutInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const planKey = params.get("plan") ?? "";
  const [plan, setPlan] = useState<PlanCard | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSetup = planKey === "setup";
  const valid = isSetup || PAID.has(planKey);

  useEffect(() => {
    if (!valid) return;
    void restClient.plans.list().then((res) => {
      if (!res.success) {
        setError(res.message);
        setReady(true);
        return;
      }
      if (!res.data.billingEnabled) {
        setError("Checkout is not open yet.");
        setReady(true);
        return;
      }
      if (isSetup) {
        setPlan({
          id: "free",
          name: SETUP_OFFER.name,
          tagline: SETUP_OFFER.tagline,
          priceMonthlyUsd: SETUP_OFFER.priceUsd,
          features: [...SETUP_OFFER.features],
        });
      } else {
        const match = (res.data.plans as PlanCard[]).find((item) => item.id === planKey) ?? null;
        setPlan(match);
        if (!match) setError("That plan is not available.");
      }
      setReady(true);
    });
  }, [isSetup, planKey, valid]);

  async function pay() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/checkout?plan=${planKey}`)}`);
      return;
    }
    setBusy(true);
    setError(null);
    const res = isSetup
      ? await restClient.billing.checkoutSetup()
      : await restClient.billing.checkout(planKey as "standard" | "premium" | "enterprise");
    if (res.success && res.data.url) {
      window.location.href = res.data.url;
      return;
    }
    setError(res.success ? "Payment could not be started." : res.message);
    setBusy(false);
  }

  const amount = plan?.priceMonthlyUsd ?? null;
  const priceLabel = formatUsdPrice(amount, { suffix: isSetup ? "" : "/mo" });

  return (
    <div className="min-h-dvh bg-paper">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/pricing" className="flex items-center gap-3">
          <LogoMark size="sm" />
          <Wordmark subtitle="Checkout" />
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-5 pb-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <section>
          <p className="text-[13px] font-semibold text-ink-muted">Order</p>
          <h1 className="mt-2 font-display text-[2rem] font-semibold tracking-tight text-night">
            {plan ? plan.name : "Checkout"}
          </h1>
          {plan ? <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-ink-muted">{plan.tagline}</p> : null}
          {plan ? (
            <ul className="mt-6 space-y-2 text-[15px] text-ink">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span className="text-accent">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <aside className="rounded-[1.5rem] border border-ink/10 bg-paper-elevated p-6 shadow-premium sm:p-8">
          {!valid ? (
            <p className="text-[15px] text-ink-muted">
              Choose a plan on the{" "}
              <Link href="/pricing" className="font-semibold text-night">
                pricing page
              </Link>
              .
            </p>
          ) : !ready || loading ? (
            <p className="text-[15px] text-ink-muted">Loading your order…</p>
          ) : (
            <>
              <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Due today</p>
              <p className="mt-2 font-display text-4xl font-semibold tracking-tight text-night">{priceLabel}</p>
              <p className="mt-2 text-[14px] text-ink-muted">
                {isSetup ? "One-time setup. Charged in US dollars." : "Billed monthly in US dollars. Cancel anytime before the next charge."}
              </p>
              {user ? <p className="mt-4 text-[14px] text-ink">{user.email}</p> : null}

              {error ? (
                <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3.5 py-2.5 text-[14px] text-rose-700">
                  {error}
                </p>
              ) : null}

              <Button className="mt-6 w-full" size="lg" disabled={busy || !plan} onClick={() => void pay()}>
                {busy ? "Opening secure payment…" : amount != null ? `Pay ${formatUsdPrice(amount, { suffix: "" })}` : "Pay"}
              </Button>
              <p className="mt-3 text-center text-[13px] leading-relaxed text-ink-muted">
                The next page takes the card payment. Nothing is charged on this screen.
              </p>
              <p className="mt-4 text-center text-[13px]">
                <Link href="/pricing" className="font-semibold text-ink-muted hover:text-night">
                  Back to plans
                </Link>
              </p>
            </>
          )}
        </aside>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center text-sm text-ink-muted">Loading checkout…</div>}>
      <CheckoutInner />
    </Suspense>
  );
}
