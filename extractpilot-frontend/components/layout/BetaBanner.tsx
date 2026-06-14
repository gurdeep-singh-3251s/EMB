import { BETA_ACCESS_NOTICE, BETA_DISCLAIMER, BETA_LAUNCH_LABEL } from "@repo/config/plans";
import Link from "next/link";

export function BetaBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-950">
      <span className="font-semibold">Closed beta · {BETA_LAUNCH_LABEL}</span>
      <span className="mx-2 hidden md:inline">·</span>
      <span className="hidden md:inline">{BETA_DISCLAIMER}</span>
      <span className="mx-2 hidden lg:inline">·</span>
      <span className="hidden lg:inline">Invite-only · selected testers</span>
      <Link href="/pricing" className="ml-3 font-semibold underline hover:no-underline">
        Preview plans
      </Link>
    </div>
  );
}

export function BetaNoticePanel({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4 text-sm text-amber-950 ${className}`}
    >
      <p className="font-semibold">Closed beta — invite-only access</p>
      <p className="mt-2 leading-relaxed text-amber-900/90">{BETA_ACCESS_NOTICE}</p>
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-amber-800">{BETA_LAUNCH_LABEL}</p>
    </div>
  );
}
