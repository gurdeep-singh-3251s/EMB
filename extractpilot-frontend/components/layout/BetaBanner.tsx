import { SETUP_OFFER } from "@repo/config/plans";
import Link from "next/link";
import { formatUsdPrice } from "@repo/config/plans";

export function BetaBanner() {
  return (
    <div className="border-b border-rust/30 bg-[#f3ebe3] px-4 py-2 text-center text-sm text-ink">
      <span className="font-medium">Founding access</span>
      <span className="mx-2 hidden text-ink-faint md:inline">·</span>
      <span className="hidden text-ink-muted md:inline">
        {SETUP_OFFER.name} {formatUsdPrice(SETUP_OFFER.priceUsd, { suffix: "" })} — limited slots
      </span>
      <Link href="/pricing" className="ml-3 font-semibold text-rust underline-offset-2 hover:underline">
        See plans
      </Link>
    </div>
  );
}

export function BetaNoticePanel({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-ink/10 bg-paper-elevated px-5 py-4 text-sm text-ink ${className}`}
    >
      <p className="font-display font-semibold text-ink">{SETUP_OFFER.name}</p>
      <p className="mt-2 leading-relaxed text-ink-muted">
        Book a guided onboarding if you'd rather not wire IMAP and schemas alone — same pipeline, fewer
        wrong turns on week one.
      </p>
    </div>
  );
}
