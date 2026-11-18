"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getGoogleLoginUrl } from "@/lib/authSession";
import { LogoMark, Wordmark } from "@/components/brand/LogoMark";
import { InboxToJsonDemo } from "@/components/landing/InboxToJsonDemo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_denied: "Google sign-in was cancelled.",
  oauth_token: "Could not complete Google sign-in. Try again.",
  oauth_profile: "Could not read your Google profile.",
  session: "Signed in with Google but the session could not be verified. Check API_URL on Vercel.",
};

export default function LoginPage() {
  const params = useSearchParams();
  const errorKey = params.get("error");
  const next = params.get("next") ?? "/dashboard";
  const loginUrl = `${getGoogleLoginUrl()}?state=${encodeURIComponent(next)}`;

  return (
    <div className="min-h-screen bg-paper lg:grid lg:min-h-[100dvh] lg:grid-cols-2">
      <aside className="hidden border-r border-ink/[0.06] bg-paper-elevated/40 lg:flex lg:flex-col lg:justify-center lg:px-12 lg:py-12 xl:px-16">
        <p className="section-label-accent">Inbox automation</p>
        <h1 className="mt-4 max-w-md text-[1.75rem] font-bold leading-snug text-night xl:text-3xl">
          Save 10+ hours a week — start in about 10 minutes.
        </h1>
        <p className="mt-4 max-w-md text-[16px] leading-relaxed text-ink-muted">
          Connect multiple mailboxes, extract structured JSON from anyone who emails you, and keep every workspace
          private to your Google account.
        </p>
        <div className="mt-8 w-full max-w-lg">
          <InboxToJsonDemo animated={false} />
        </div>
      </aside>

      <main className="relative flex min-h-[100dvh] items-center justify-center px-6 py-12 sm:px-8">
        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[420px]">
          <div className="saas-card p-8 shadow-ledger-lg sm:p-9">
            <div className="mb-8 flex items-center gap-3">
              <LogoMark />
              <Wordmark subtitle="Sign in to continue" />
            </div>

            <p className="mb-6 text-[15px] leading-relaxed text-ink-muted lg:hidden">
              Automate inbox workflows across multiple mailboxes and turn email from anyone into structured JSON.
            </p>

            {errorKey ? (
              <p className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[15px] text-rose-900">
                {ERROR_MESSAGES[errorKey] ?? "Sign-in failed. Please try again."}
              </p>
            ) : null}

            <a
              href={loginUrl}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-ink/10 bg-paper px-4 py-4 text-[15px] font-semibold text-night transition hover:border-ink/20 hover:bg-paper-elevated"
            >
              <GoogleGlyph />
              Continue with Google
            </a>

            <p className="mt-6 text-center text-[14px] leading-relaxed text-ink-muted">
              First time? We create your workspace automatically — no credit card.
            </p>

            <p className="mt-6 text-center text-[15px]">
              <Link href="/" className="font-semibold text-accent hover:text-accent-light">
                ← Back to home
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
