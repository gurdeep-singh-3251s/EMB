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

const providers = ["Agent Gmail", "Office Outlook", "Transaction desk", "Property mgmt", "Any IMAP"];

const workflowSteps = [
  {
    n: "01",
    title: "Connect every brokerage inbox",
    body: "Add multiple Gmail accounts for agents, ISAs, and managers. Switch the active mailbox when you extract.",
  },
  {
    n: "02",
    title: "Use real-estate prompts",
    body: "Buyer leads, seller intake, showings, offers, escrow — or build your own schema with confidence scores.",
  },
  {
    n: "03",
    title: "Pick from 50+ AI models",
    body: "Choose classify + extract models by plan. If a model is unavailable, ExtractPilot falls back automatically.",
  },
];

const outcomes = [
  {
    title: "Built for brokerages",
    body: "Managers see structured leads and listing intake instead of messy shared inboxes.",
  },
  {
    title: "1,000 emails / week on Team",
    body: "Enough volume for a busy sales floor — with 20+ AI models and multi-Gmail workspaces.",
  },
  {
    title: "Confidence you can trust",
    body: "Every classification includes a confidence score so staff know what to review.",
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
        });
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="min-h-screen bg-paper">
      <header
        ref={headerRef}
        className="sticky top-0 z-30 border-b border-ink/[0.06] bg-paper/85 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark size="sm" />
            <Wordmark subtitle="For real estate teams" />
          </Link>
          <div className="flex items-center gap-2">
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

      <section className="hero-grid-line relative overflow-hidden border-b border-ink/[0.06]">
        <HeroAmbient />
        <div className="relative mx-auto grid max-w-[1120px] gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="hero-copy">
            <p className="font-display text-2xl font-extrabold tracking-tight text-night sm:text-3xl">ExtractPilot</p>
            <h1 className="mt-5 text-[2.35rem] font-extrabold leading-[1.08] tracking-tight text-night sm:text-5xl lg:text-[3.05rem]">
              Turn brokerage email into{" "}
              <span className="text-accent">structured deals</span> — in about 10 minutes.
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink-muted lg:text-[18px]">
              Built for real-estate managers and agents: connect multiple Gmails, run industry prompts, pick from 50+ AI
              models, and push clean fields into the tools your team already uses.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <LinkButton href={startHref} variant="accent" size="lg">
                {signedIn ? "Open workspace" : "Start for free"}
              </LinkButton>
              <LinkButton href={docsHref} variant="secondary" size="lg">
                See Docs — how to integrate
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
          <div className="hero-demo-wrap">
            <InboxToJsonDemo className="demo-shadow" />
          </div>
        </div>
      </section>

      <section className="scroll-rise border-b border-ink/[0.06] bg-paper-elevated/70">
        <div className="mx-auto grid max-w-[1120px] gap-8 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="section-label-accent">Multi-Gmail</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-night lg:text-4xl">
              One workspace for every agent inbox.
            </h2>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-ink-muted">
              Connect as many Gmail accounts as you need — ISA, listing agents, transaction coordinators — then extract
              from the active mailbox without sharing passwords across tools.
            </p>
            <Link href="/dashboard/mailboxes" className="link-arrow mt-8">
              Connect mailboxes <span aria-hidden>↗</span>
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "ISA desk", meta: "leads@brokerage.com · Gmail", active: true },
              { label: "Listing agent", meta: "sam@brokerage.com · Gmail", active: false },
              { label: "TC / escrow", meta: "closings@brokerage.com · Gmail", active: false },
              { label: "Property mgmt", meta: "pm@brokerage.com · Outlook", active: false },
            ].map((box) => (
              <MotionCard
                key={box.label}
                className={`p-5 ${box.active ? "border-accent/35 bg-accent-soft/50" : "saas-card"}`}
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
          <p className="section-label">Why brokerages choose ExtractPilot</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-night">
            Feels purpose-built for real estate — not a generic inbox toy.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {outcomes.map((item) => (
            <MotionCard key={item.title} className="scroll-rise saas-card p-8">
              <h3 className="text-xl font-bold text-night">{item.title}</h3>
              <p className="mt-3 text-[16px] leading-relaxed text-ink-muted">{item.body}</p>
            </MotionCard>
          ))}
        </div>
      </section>

      <section className="scroll-rise mx-auto max-w-[1120px] px-6 pb-6">
        <p className="section-label">How it works</p>
        <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-night">
          From messy Gmail to CRM-ready fields.
        </h2>
      </section>

      <section className="mx-auto grid max-w-[1120px] gap-4 px-6 pb-20 lg:grid-cols-3">
        {workflowSteps.map((s) => (
          <MotionCard key={s.n} className="scroll-rise saas-card flex flex-col p-8">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
              {s.n}
            </span>
            <h3 className="mt-4 text-xl font-bold text-night">{s.title}</h3>
            <p className="mt-3 flex-1 text-[16px] leading-relaxed text-ink-muted">{s.body}</p>
          </MotionCard>
        ))}
      </section>

      <section className="scroll-rise saas-card-dark mx-6 mb-16 max-w-[1120px] lg:mx-auto">
        <div className="flex flex-col items-start justify-between gap-8 p-10 sm:p-12 lg:flex-row lg:items-center">
          <div>
            <p className="section-label !text-white/50">Manager demo</p>
            <p className="mt-3 text-2xl font-bold text-white lg:text-3xl">
              Ready for your brokerage walkthrough.
            </p>
            <p className="mt-3 max-w-md text-[17px] text-white/70">
              Sign in, connect two Gmails, load a buyer-lead prompt, pick an AI model, and show confidence-scored results
              live.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <LinkButton href={startHref} variant="accent" size="lg">
              {signedIn ? "Open workspace" : "Start for free"}
            </LinkButton>
            <LinkButton href={docsHref} variant="inverse" size="lg">
              See Docs
            </LinkButton>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink/[0.06] px-6 py-8 text-[15px] text-ink-muted">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4">
          <span>ExtractPilot — inbox automation for real estate teams</span>
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
            <Link href={signedIn ? "/dashboard" : "/login?next=/dashboard"} className="font-semibold text-accent hover:text-accent-light">
              {signedIn ? "Dashboard ↗" : "Start free ↗"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
