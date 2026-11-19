"use client";

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { motion } from "motion/react";
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
  const figure = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = figure.current;
    if (!el || amount == null) return;
    const state = { value: 0 };
    const tween = gsap.to(state, {
      value: amount,
      duration: 0.7,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = formatUsdPrice(state.value, { suffix: isSetup ? "" : "/mo" });
      },
    });
    return () => {
      tween.kill();
    };
  }, [amount, isSetup]);

  return (
    <div className="min-h-dvh bg-paper">
      <header className="mx-auto flex max-w-[760px] items-center justify-between border-b border-ink/15 px-5 py-4">
        <Link href="/pricing" className="flex items-center gap-3">
          <LogoMark size="sm" />
          <Wordmark subtitle="Checkout" />
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-[760px] px-5 py-10">
        {!valid ? (
          <p className="text-[15px] text-ink-muted">
            Pick a plan on the <Link href="/pricing" className="font-semibold text-night">pricing page</Link>.
          </p>
        ) : !ready || loading ? (
          <p className="text-[15px] text-ink-muted">Loading the order…</p>
        ) : (
          <>
            <div className="flex items-end justify-between gap-6 border-b border-ink/15 pb-6">
              <div>
                <h1 className="font-display text-[2rem] font-semibold leading-none text-night">{plan?.name ?? "Checkout"}</h1>
                {user ? <p className="mt-3 text-[14px] text-ink-muted">{user.email}</p> : null}
              </div>
              <p ref={figure} className="font-display text-[2rem] font-semibold leading-none text-night">
                {priceLabel}
              </p>
            </div>
            {plan ? (
              <ul className="border-b border-ink/15">
                {plan.features.map((feature) => (
                  <li key={feature} className="border-b border-ink/10 py-3 text-[15px] text-ink last:border-0">
                    {feature}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-5 text-[14px] text-ink-muted">
              {isSetup ? "One-time. Charged in US dollars." : "Monthly, in US dollars. Cancel before the next charge."}
            </p>
            {error ? <p className="mt-4 text-[14px] text-rose-700">{error}</p> : null}
            <motion.div whileTap={{ scale: 0.98 }} className="mt-6 max-w-xs">
              <Button className="w-full" size="lg" disabled={busy || !plan} onClick={() => void pay()}>
                {busy ? "Opening payment…" : amount != null ? `Pay ${formatUsdPrice(amount, { suffix: "" })}` : "Pay"}
              </Button>
            </motion.div>
            <p className="mt-3 text-[13px] text-ink-muted">Card details are taken on the next page.</p>
          </>
        )}
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
