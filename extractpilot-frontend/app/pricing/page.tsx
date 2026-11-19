"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { BETA_ACCESS_NOTICE, FIRST_MONTH_DISCOUNT_LABEL, formatUsdPrice, type PlanId } from "@repo/config/plans";
import { restClient } from "@/lib/restClient";
import { LinkButton } from "@/components/ui/LinkButton";
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

export default function PricingPage() {
  const { user, loading: authLoading } = useAuth();
  const signedIn = Boolean(user);
  const [plans, setPlans] = useState<PlanCard[]>([]);
  const [billingEnabled, setBillingEnabled] = useState(false);

  useEffect(() => {
    void restClient.plans.list().then((res) => {
      if (res.success) {
        setPlans(res.data.plans as PlanCard[]);
        setBillingEnabled(Boolean(res.data.billingEnabled));
      }
    });
  }, []);

  const checkoutHref = (planId: string) => {
    const dest = `/checkout?plan=${planId}`;
    return signedIn || authLoading ? dest : `/login?next=${encodeURIComponent(dest)}`;
  };

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

      <main className="mx-auto max-w-[1120px] px-6 py-12">
        <h1 className="font-display text-[2.4rem] font-semibold leading-none text-night">Pricing</h1>
        <p className="mt-3 max-w-lg text-[16px] text-ink-muted">
          Same product on every plan. The limit and the models change. Prices are in US dollars.
        </p>
        {billingEnabled ? (
          <p className="mt-3 text-[14px] text-ink">{FIRST_MONTH_DISCOUNT_LABEL}</p>
        ) : (
          <p className="mt-3 max-w-lg text-[14px] text-ink-muted">{BETA_ACCESS_NOTICE}</p>
        )}

        <ul className="mt-10 border-t border-ink/15">
          {freePlan ? (
            <PlanRow
              name={freePlan.name}
              price={formatUsdPrice(freePlan.priceMonthlyUsd, { suffix: "" })}
              detail={freePlan.features.slice(0, 3).join(" · ")}
              href={startHref}
              action={signedIn ? "Open" : "Start"}
            />
          ) : null}
          {paidPlans.map((plan) => (
            <PlanRow
              key={plan.id}
              name={plan.name}
              price={formatUsdPrice(plan.priceMonthlyUsd)}
              detail={plan.features.slice(0, 3).join(" · ")}
              href={billingEnabled ? checkoutHref(plan.id) : signedIn ? workspaceHref : `/login?next=${encodeURIComponent(workspaceHref)}`}
              action={billingEnabled ? "Continue" : "View"}
              mark={plan.popular ? "Usual pick" : undefined}
            />
          ))}
          <PlanRow
            name="Guided setup"
            price="$99.99"
            detail="One sitting to connect mailboxes, write the schema, and run a live extract."
            href={billingEnabled ? checkoutHref("setup") : startHref}
            action="Continue"
          />
        </ul>
      </main>
    </div>
  );
}

function PlanRow({
  name,
  price,
  detail,
  href,
  action,
  mark,
}: {
  name: string;
  price: string;
  detail: string;
  href: string;
  action: string;
  mark?: string;
}) {
  return (
    <motion.li whileHover={{ backgroundColor: "rgba(15, 23, 42, 0.03)" }} className="border-b border-ink/15">
      <Link href={href} className="grid items-center gap-3 px-1 py-5 sm:grid-cols-[14rem_1fr_auto] sm:gap-8">
        <span>
          <span className="block font-semibold text-night">{name}</span>
          {mark ? <span className="font-mono text-[12px] text-ink-faint">{mark}</span> : null}
        </span>
        <span className="text-[14px] leading-snug text-ink-muted">{detail}</span>
        <span className="flex items-baseline justify-between gap-6 sm:justify-end">
          <span className="font-display text-lg text-night">{price}</span>
          <span className="text-[14px] font-semibold text-night">{action}</span>
        </span>
      </Link>
    </motion.li>
  );
}
