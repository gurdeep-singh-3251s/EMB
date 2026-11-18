"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LinkButton } from "@/components/ui/LinkButton";
import { LogoMark, Wordmark } from "@/components/brand/LogoMark";
import { InboxToJsonDemo } from "@/components/landing/InboxToJsonDemo";
import { HeroAmbient } from "@/components/motion/HeroAmbient";
import { MotionCard } from "@/components/motion/MotionCard";
import { useAuth } from "@/providers/AuthProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const providers = ["Gmail", "Outlook", "IMAP", "Shared inboxes", "Team aliases"];

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
    title: "Pick from 50+ AI models",
    body: "Choose classify + extract models by plan. If a model is unavailable, ExtractPilot falls back automatically.",
  },
];

const outcomes = [
  {
    title: "Built for high-volume mail",
    body: "Whether you get dozens or hundreds of emails a day, automate the reading and copy-paste work.",
  },
  {
    title: "1,000 emails / week on Team",
    body: "Enough volume for a busy shared inbox — with 20+ AI models and multi-mailbox workspaces.",
  },
  {
    title: "Confidence you can trust",
    body: "Every classification includes a confidence score so your team knows what to review.",
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

      gsap.from(".hero-copy > *", {
        opacity: 0,
        y: 22,
        duration: 0.75,
        stagger: 0.09,
        ease: "power3.out",
        delay: 0.05,
      });

      gsap.from(".hero-demo-wrap", {
        opacity: 0,
        x: 40,
        scale: 0.96,
        duration: 1,
        ease: "power3.out",
        delay: 0.15,
      });

      gsap.from(".provider-chip", {
        opacity: 0,
        y: 10,
        stagger: 0.05,
        duration: 0.45,
        ease: "power2.out",
        delay: 0.55,
      });

      gsap.utils.toArray<HTMLElement>(".scroll-rise").forEach((block) => {
        gsap.from(block, {
          scrollTrigger: { trigger: block, start: "top 88%", toggleActions: "play none none none" },
          opacity: 0,
          y: 36,
          duration: 0.8,
          ease: "power3.out",
          clearProps: "opacity,transform",
        });
      });

      gsap.to(".hero-float", {
        y: -12,
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
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

      <section className="hero-grid-line surface-noise relative overflow-hidden border-b border-ink/[0.06]">
        <HeroAmbient />
        <div className="relative mx-auto grid max-w-[1120px] gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div className="hero-copy">
            <p className="font-display text-3xl font-extrabold tracking-tight text-night sm:text-4xl">ExtractPilot</p>
            <h1 className="mt-5 font-display text-[2.35rem] font-extrabold leading-[1.06] tracking-tight text-night sm:text-5xl lg:text-[3.15rem]">
              Automate the inbox that never stops —{" "}
              <span className="bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">
                structured data in minutes
              </span>
              .
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink-muted lg:text-[18px]">
              For sales, ecommerce, support, ops, and anyone drowning in email. Connect mailboxes, write requirements in
              plain language, pick from 50+ AI models, and push clean fields into your tools.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <LinkButton href={startHref} variant="accent" size="lg">
                {signedIn ? "Open workspace" : "Start free"}
              </LinkButton>
              <LinkButton href={docsHref} variant="secondary" size="lg">
                See Docs
              </LinkButton>
            </div>
            <div className="mt-10 flex flex-wrap gap-2">
              {providers.map((name) => (
                <span key={name} className="provider-chip pill">
                  {name}
                </span>
              ))}
            </div>
          </div>
          <div className="hero-demo-wrap hero-float">
            <InboxToJsonDemo className="demo-shadow" />
          </div>
        </div>
      </section>

      <section className="scroll-rise border-b border-ink/[0.06]">
        <div className="mx-auto max-w-[1120px] px-6 py-16">
          <div className="max-w-2xl">
            <p className="section-label-accent">Who it&apos;s for</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-night lg:text-4xl">
              Same product for every team that lives in email.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {audiences.map((item) => (
              <MotionCard key={item.title} className="saas-card group p-7">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-xl font-bold text-night">{item.title}</h3>
                  <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold tracking-wide text-accent transition group-hover:bg-accent group-hover:text-white">
                    {item.icon}
                  </span>
                </div>
                <p className="mt-3 text-[16px] leading-relaxed text-ink-muted">{item.body}</p>
              </MotionCard>
            ))}
          </div>
        </div>
      </section>

      <section className="scroll-rise border-b border-ink/[0.06] bg-paper-elevated/60">
        <div className="mx-auto grid max-w-[1120px] gap-8 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="section-label-accent">Multi-mailbox</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-night lg:text-4xl">
              One workspace for every inbox that matters.
            </h2>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-ink-muted">
              Connect sales, support, orders, vendor, or personal work accounts — then extract from the active mailbox
              without sharing passwords across tools.
            </p>
            <Link href="/dashboard/mailboxes" className="link-arrow mt-8">
              Connect mailboxes <span aria-hidden>↗</span>
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Sales inbox", meta: "leads@company.com · Gmail", active: true },
              { label: "Support desk", meta: "help@company.com · Gmail", active: false },
              { label: "Orders / ecommerce", meta: "orders@shop.com · IMAP", active: false },
              { label: "Ops / vendors", meta: "ops@company.com · Outlook", active: false },
            ].map((box) => (
              <MotionCard
                key={box.label}
                className={`p-5 transition ${
                  box.active
                    ? "border border-accent/35 bg-accent-soft/60 shadow-glow"
                    : "saas-card"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-night">{box.label}</p>
                  {box.active ? (
                    <span className="rounded-md bg-moss/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-moss">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Ready</span>
                  )}
                </div>
                <p className="mt-2 text-[13px] text-ink-muted">{box.meta}</p>
              </MotionCard>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-6 py-16">
        <div className="scroll-rise max-w-2xl">
          <p className="section-label">Why teams choose ExtractPilot</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-night">
            Stop drowning in email. Start shipping structured work.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {outcomes.map((item) => (
            <MotionCard key={item.title} className="scroll-rise saas-card p-8">
              <div className="mb-5 h-1 w-12 rounded-full bg-gradient-to-r from-accent to-accent-light" />
              <h3 className="font-display text-xl font-bold text-night">{item.title}</h3>
              <p className="mt-3 text-[16px] leading-relaxed text-ink-muted">{item.body}</p>
            </MotionCard>
          ))}
        </div>
      </section>

      <section className="scroll-rise mx-auto max-w-[1120px] px-6 pb-6">
        <p className="section-label">How it works</p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight text-night">
          From messy inbox to CRM-ready fields.
        </h2>
      </section>

      <section className="mx-auto grid max-w-[1120px] gap-4 px-6 pb-20 lg:grid-cols-3">
        {workflowSteps.map((s) => (
          <MotionCard key={s.n} className="scroll-rise saas-card flex flex-col p-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft font-display text-sm font-bold text-accent">
              {s.n}
            </span>
            <h3 className="mt-5 font-display text-xl font-bold text-night">{s.title}</h3>
            <p className="mt-3 flex-1 text-[16px] leading-relaxed text-ink-muted">{s.body}</p>
          </MotionCard>
        ))}
      </section>

      <section className="scroll-rise saas-card-dark mx-6 mb-16 max-w-[1120px] lg:mx-auto">
        <div className="relative z-10 flex flex-col items-start justify-between gap-8 p-10 sm:p-12 lg:flex-row lg:items-center">
          <div>
            <p className="section-label !text-white/50">Ready when you are</p>
            <p className="mt-3 font-display text-2xl font-bold text-white lg:text-3xl">
              Start free. Automate your mail workflow today.
            </p>
            <p className="mt-3 max-w-md text-[17px] text-white/70">
              Sign in, connect an inbox, write requirements (or pick a template), extract, then wire results into Slack,
              Zapier, or your CRM.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <LinkButton href={startHref} variant="accent" size="lg">
              {signedIn ? "Open workspace" : "Start free"}
            </LinkButton>
            <LinkButton href={docsHref} variant="inverse" size="lg">
              See Docs
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
