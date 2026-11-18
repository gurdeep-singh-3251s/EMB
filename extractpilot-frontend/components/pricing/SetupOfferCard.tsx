"use client";

import { SETUP_OFFER, formatUsdPrice } from "@repo/config/plans";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";

type SetupOfferCardProps = {
  billingEnabled?: boolean;
  onCheckout?: () => void;
  checkoutLoading?: boolean;
  className?: string;
  /** When checkout is unavailable — keep signed-in users in the workspace. */
  fallbackHref?: string;
  fallbackLabel?: string;
};

export function SetupOfferCard({
  billingEnabled,
  onCheckout,
  checkoutLoading,
  className = "",
  fallbackHref = "/login?next=/dashboard",
  fallbackLabel = "Start free in the console",
}: SetupOfferCardProps) {
  return (
    <article className={`saas-card p-6 md:p-8 ${className}`}>
      <p className="section-label-accent">Optional add-on</p>
      <h2 className="mt-2 text-xl font-bold text-night">{SETUP_OFFER.name}</h2>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-muted">{SETUP_OFFER.tagline}</p>
      <p className="mt-2 text-[14px] text-ink-faint">
        You don&apos;t need this to use ExtractPilot — the free console walks you through mailbox, schema, and
        extraction step by step.
      </p>

      <ul className="mt-6 grid gap-2 text-[15px] text-ink-muted sm:grid-cols-2">
        {SETUP_OFFER.features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-accent" aria-hidden>
              ✓
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-baseline gap-2 border-t border-ink/[0.06] pt-6">
        <span className="text-3xl font-bold text-night">{formatUsdPrice(SETUP_OFFER.priceUsd, { suffix: "" })}</span>
        <span className="text-[15px] text-ink-muted">one-time fee (separate from your monthly plan)</span>
      </div>

      {billingEnabled && onCheckout ? (
        <Button
          variant="secondary"
          size="lg"
          className="mt-6"
          disabled={checkoutLoading}
          onClick={() => onCheckout()}
        >
          {checkoutLoading ? "Redirecting…" : "Request guided setup"}
        </Button>
      ) : (
        <LinkButton href={fallbackHref} variant="secondary" size="lg" className="mt-6">
          {fallbackLabel}
        </LinkButton>
      )}
    </article>
  );
}
