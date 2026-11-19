"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LinkButton } from "@/components/ui/LinkButton";
import { LogoMark, Wordmark } from "@/components/brand/LogoMark";
import { InboxToJsonDemo } from "@/components/landing/InboxToJsonDemo";
import { useAuth } from "@/providers/AuthProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const audiences = [
  {
    title: "Business leaders & ops",
    body: "Turn shared inboxes into dashboards of structured work — no more copy-paste into spreadsheets.",
    icon: "01",
  },
  {
    title: "Sales & account teams",
    body: "Pull leads, deal terms, and follow-ups from hundreds of emails into your CRM automatically.",
    icon: "02",
  },
  {
    title: "Ecommerce & marketplace",
    body: "Extract orders, returns, supplier updates, and customer issues from daily mail volume.",
    icon: "03",
  },
  {
    title: "Support & offices",
    body: "Classify tickets, pull case fields from attachments, and route clean JSON to helpdesk tools.",
    icon: "04",
  },
];

const workflowSteps = [
  {
    n: "01",
    title: "Connect every inbox",
    body: "Add Gmail, Outlook, or IMAP for sales, support, orders, or personal work mail. Switch the active mailbox when you extract.",
  },
  {
    n: "02",
    title: "Write your requirements",
    body: "Describe what to extract in plain language — or start from a template — and define the JSON fields you need back.",
  },
  {
    n: "03",
    title: "Use current models",
    body: "Pick GPT, Sonnet, Fable, and the other current models on your plan. If one is unavailable, ExtractPilot falls back automatically.",
  },
];

export function LandingPage() {
  const { user, loading: authLoading } = useAuth();
  const signedIn = Boolean(user);
  const startHref = signedIn ? "/dashboard" : "/login?next=/dashboard";
  const docsHref = signedIn ? "/dashboard/developers" : "/docs";
  const root = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = root.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.from(headerRef.current, { y: -16, opacity: 0, duration: 0.7, ease: "power3.out" });
      }

      gsap.set(".line-reveal", { yPercent: 110 });
      gsap.to(".line-reveal", {
        yPercent: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: "power4.out",
      });

      gsap.fromTo(
        ".hero-demo-wrap",
        { clipPath: "inset(14% 10% 14% 10%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 1.05, ease: "power3.out", delay: 0.12 },
      );

      gsap.utils.toArray<HTMLElement>(".rule-row").forEach((row) => {
        gsap.from(row, {
          scrollTrigger: { trigger: row, start: "top 90%", toggleActions: "play none none none" },
          x: -16,
          duration: 0.6,
          ease: "power2.out",
          clearProps: "transform",
        });
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="marketing-shell">
      <header ref={headerRef} className="marketing-header">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark size="sm" />
            <Wordmark subtitle="Email workflow automation" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LinkButton href="/docs" variant="ghost" size="sm">
              Docs
            </LinkButton>
            <LinkButton href="/pricing" variant="ghost" size="sm">
              Pricing
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

      <section className="flex min-h-[calc(100svh-4.5rem)] items-center border-b border-ink/15">
        <div className="mx-auto grid w-full max-w-[1120px] gap-10 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <h1 className="overflow-hidden font-display text-[2.4rem] font-semibold leading-[1.02] text-night sm:text-[3.2rem]">
              <span className="line-reveal block">The inbox, as a table.</span>
            </h1>
            <p className="mt-5 max-w-md text-[17px] leading-snug text-ink-muted">
              Connect a mailbox, say which fields you need, and ExtractPilot writes them out. GPT and Sonnet do the reading.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <LinkButton href={startHref} variant="primary" size="lg">
                {signedIn ? "Open workspace" : "Start free"}
              </LinkButton>
              <LinkButton href={docsHref} variant="secondary" size="lg">
                Docs
              </LinkButton>
            </div>
          </div>
          <div className="hero-demo-wrap">
            <InboxToJsonDemo className="demo-shadow" />
          </div>
        </div>
      </section>

      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-[1120px] px-6 py-16">
          <h2 className="font-display text-2xl font-semibold text-night">Who uses it</h2>
          <ol className="mt-8 border-t border-ink/15">
            {audiences.map((item) => (
              <li key={item.title} className="rule-row grid gap-2 border-b border-ink/15 py-5 sm:grid-cols-[4rem_14rem_1fr] sm:items-baseline">
                <span className="font-mono text-[13px] text-ink-faint">{item.icon}</span>
                <h3 className="font-semibold text-night">{item.title}</h3>
                <p className="text-[15px] leading-snug text-ink-muted">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-[1120px] px-6 py-16">
          <div className="flex items-end justify-between gap-6">
            <h2 className="max-w-md font-display text-2xl font-semibold text-night">Four inboxes. One active extract.</h2>
            <Link href="/dashboard/mailboxes" className="hidden text-[15px] font-semibold text-night underline decoration-ink/30 underline-offset-4 sm:inline">
              Connect mailboxes
            </Link>
          </div>
          <ul className="mt-8 border-t border-ink/15">
            {[
              { label: "Sales inbox", meta: "leads@company.com · Gmail", state: "Active" },
              { label: "Support desk", meta: "help@company.com · Gmail", state: "Ready" },
              { label: "Orders", meta: "orders@shop.com · IMAP", state: "Ready" },
              { label: "Ops", meta: "ops@company.com · Outlook", state: "Ready" },
            ].map((box) => (
              <li key={box.label} className="rule-row flex items-baseline justify-between gap-4 border-b border-ink/15 py-4">
                <span>
                  <span className="font-semibold text-night">{box.label}</span>
                  <span className="ml-3 text-[14px] text-ink-muted">{box.meta}</span>
                </span>
                <span className="font-mono text-[12px] text-ink-faint">{box.state}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-6 py-16">
        <h2 className="font-display text-2xl font-semibold text-night">How a run works</h2>
        <ol className="mt-8 border-t border-ink/15">
          {workflowSteps.map((step) => (
            <li key={step.n} className="rule-row grid gap-2 border-b border-ink/15 py-5 sm:grid-cols-[4rem_16rem_1fr] sm:items-baseline">
              <span className="font-mono text-[13px] text-ink-faint">{step.n}</span>
              <h3 className="font-semibold text-night">{step.title}</h3>
              <p className="text-[15px] leading-snug text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-ink/15">
        <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-6 px-6 py-12 sm:flex-row sm:items-center">
          <p className="max-w-md font-display text-2xl font-semibold text-night">Basic is free. Paid plans start at $24.99.</p>
          <div className="flex gap-3">
            <LinkButton href={startHref} variant="primary" size="lg">
              {signedIn ? "Open workspace" : "Start free"}
            </LinkButton>
            <LinkButton href="/pricing" variant="secondary" size="lg">
              Pricing
            </LinkButton>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink/[0.06] px-6 py-8 text-[15px] text-ink-muted">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4">
          <span>ExtractPilot — inbox automation for every team</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-night">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-night">
              Terms
            </Link>
            <Link href="/docs" className="hover:text-night">
              Docs
            </Link>
            <Link
              href={signedIn ? "/dashboard" : "/login?next=/dashboard"}
              className="font-semibold text-accent hover:text-accent-light"
            >
              {signedIn ? "Dashboard ↗" : "Start free ↗"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
