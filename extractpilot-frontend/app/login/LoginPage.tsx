"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import gsap from "gsap";
import { getGoogleLoginUrl } from "@/lib/authSession";
import { LogoMark, Wordmark } from "@/components/brand/LogoMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_denied: "Google sign-in was cancelled.",
  oauth_token: "Could not complete Google sign-in. Try again.",
  oauth_profile: "Could not read your Google profile.",
  session: "Signed in with Google but the session could not be verified. Check API_URL on Vercel.",
};

const AFTER_SIGNIN = [
  { n: "01", title: "Write requirements", body: "Describe what to extract and which fields you need." },
  { n: "02", title: "Connect mailboxes", body: "Add Gmail or IMAP — extraction uses the active one." },
  { n: "03", title: "Extract Now", body: "Run extraction and review results with confidence scores." },
];

export default function LoginPage() {
  const params = useSearchParams();
  const errorKey = params.get("error");
  const next = params.get("next") ?? "/dashboard";
  const loginUrl = `${getGoogleLoginUrl()}?state=${encodeURIComponent(next)}`;
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.from(".login-brand > *", { opacity: 0, y: 18, duration: 0.7, stagger: 0.08, ease: "power3.out" });
      gsap.from(".login-panel", { opacity: 0, x: 28, duration: 0.85, ease: "power3.out", delay: 0.12 });
      gsap.from(".login-step", { opacity: 0, y: 14, duration: 0.55, stagger: 0.08, ease: "power2.out", delay: 0.35 });
      gsap.to(".login-orb", {
        y: -18,
        x: 12,
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.6,
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="relative min-h-[100dvh] overflow-hidden bg-paper">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="login-orb absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl" />
        <div className="login-orb absolute -bottom-32 right-0 h-[26rem] w-[26rem] rounded-full bg-moss/15 blur-3xl" />
        <div className="login-orb absolute left-1/3 top-1/3 h-64 w-64 rounded-full bg-accent-soft blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(15,23,42,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.04) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <LogoMark size="sm" />
          <Wordmark subtitle="Sign in" />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/docs" className="hidden text-[14px] font-semibold text-ink-muted transition hover:text-night sm:inline">
            See Docs
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-14 lg:pb-24 lg:pt-10">
        <section className="login-brand">
          <p className="section-label-accent">Welcome to ExtractPilot</p>
          <h1 className="mt-4 max-w-xl text-[2.4rem] font-extrabold leading-[1.05] tracking-tight text-night sm:text-5xl lg:text-[3.25rem]">
            One click. Your brokerage workspace is ready.
          </h1>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-muted sm:text-[18px]">
            Continue with Google — we create a private workspace for managers and agents. No card. No setup call
            required.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {AFTER_SIGNIN.map((step) => (
              <article key={step.n} className="login-step saas-card p-4">
                <p className="text-[11px] font-bold tracking-[0.16em] text-accent">{step.n}</p>
                <p className="mt-2 text-[15px] font-bold text-night">{step.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{step.body}</p>
              </article>
            ))}
          </div>

          <p className="mt-8 text-[14px] text-ink-muted">
            Prefer the API first?{" "}
            <Link href="/docs" className="font-semibold text-accent hover:text-accent-light">
              Read the docs
            </Link>
          </p>
        </section>

        <section className="login-panel">
          <div className="relative overflow-hidden rounded-[2rem] border border-ink/[0.08] bg-paper-elevated/90 p-8 shadow-ledger-lg backdrop-blur-xl sm:p-10">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent-light to-moss" aria-hidden />
            <div className="flex items-center gap-3">
              <LogoMark />
              <div>
                <p className="text-lg font-bold tracking-tight text-night">Start free</p>
                <p className="text-[13px] text-ink-muted">Google workspace sign-in</p>
              </div>
            </div>

            {errorKey ? (
              <p className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[15px] text-rose-900">
                {ERROR_MESSAGES[errorKey] ?? "Sign-in failed. Please try again."}
              </p>
            ) : null}

            <a
              href={loginUrl}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-inverse px-5 py-4 text-[16px] font-semibold text-inverse-fg transition hover:bg-inverse/90 active:scale-[0.99]"
            >
              <GoogleGlyph />
              Continue with Google
            </a>

            <div className="mt-6 space-y-3 rounded-2xl border border-ink/[0.06] bg-paper px-4 py-4 text-[14px] text-ink-muted">
              <p className="flex gap-2">
                <span className="text-accent" aria-hidden>
                  ✓
                </span>
                Free tier for live brokerage demos
              </p>
              <p className="flex gap-2">
                <span className="text-accent" aria-hidden>
                  ✓
                </span>
                Multi-mailbox + requirements workflow included
              </p>
              <p className="flex gap-2">
                <span className="text-accent" aria-hidden>
                  ✓
                </span>
                Your data stays in your private workspace
              </p>
            </div>

            <p className="mt-8 text-center text-[14px]">
              <Link href="/" className="font-semibold text-ink-muted transition hover:text-accent">
                ← Back to home
              </Link>
            </p>
          </div>
        </section>
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
