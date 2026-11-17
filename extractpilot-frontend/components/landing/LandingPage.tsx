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

const providers = ["Gmail", "Outlook", "Zoho", "Yahoo", "iCloud", "Any IMAP"];

const workflowSteps = [
  {
    n: "01",
    title: "Connect every inbox you run",
    body: "AP, sales, founders, shared ops — add multiple mailboxes and switch the active one when you extract.",
  },
  {
    n: "02",
    title: "Define the JSON once",
    body: "Describe the fields you need. Enhance with AI, pick models by plan, and save versions you can reactivate.",
  },
  {
    n: "03",
    title: "Automate the busywork",
    body: "Run the pipeline, review results, export CSV, or push webhooks to the tools your team already uses.",
  },
];

const outcomes = [
  {
    title: "Save 10+ hours a week",
    body: "Stop retyping invoice numbers, PO lines, and supplier details from email into spreadsheets.",
  },
  {
    title: "Live in about 10 minutes",
    body: "Sign in, connect a mailbox, save a schema, run one extract — then scale the same flow across inboxes.",
  },
  {
    title: "Connected with anyone",
    body: "Works with the mailboxes your partners already use. No vendor lock-in to a single email provider.",
  },
];

export function LandingPage() {
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
            <Wordmark subtitle="Inbox automation" />
          </Link>
          <div className="flex items-center gap-2">
            <LinkButton href="/pricing" variant="ghost" size="sm">
              Pricing
            </LinkButton>
            <LinkButton href="/login" variant="primary" size="sm">
              Sign in
            </LinkButton>
          </div>
        </div>
      </header>

      <section className="hero-grid-line relative overflow-hidden border-b border-ink/[0.06]">
        <HeroAmbient />
        <div className="relative mx-auto grid max-w-[1120px] gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="hero-copy">
            <p className="font-display text-2xl font-extrabold tracking-tight text-night sm:text-3xl">ExtractPilot</p>
            <h1 className="mt-5 text-[2.35rem] font-extrabold leading-[1.08] tracking-tight text-night sm:text-5xl lg:text-[3.15rem]">
              Automate your workflows and save{" "}
              <span className="text-accent">10+ hours a week</span> in just 10 minutes.
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink-muted lg:text-[18px]">
              Connect multiple mailboxes, extract structured JSON from anyone who emails you, and push clean data into
              the tools your ops already trust.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <LinkButton href="/login" variant="accent" size="lg">
                Start free — 10 minutes
              </LinkButton>
              <LinkButton href="/pricing" variant="secondary" size="lg">
                See pricing
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
            <p className="section-label-accent">Multi-mailbox</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-night lg:text-4xl">
              One workspace. Every inbox that matters.
            </h2>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-ink-muted">
              Finance, sales, support, and founder inboxes can all live in ExtractPilot. Add as many IMAP accounts as
              you need, label them, and keep extraction on the active mailbox.
            </p>
            <Link href="/dashboard/mailboxes" className="link-arrow mt-8">
              Open mailbox manager <span aria-hidden>↗</span>
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "AP inbox", meta: "ap@company.com · Gmail", active: true },
              { label: "Orders", meta: "orders@company.com · Outlook", active: false },
              { label: "Founder", meta: "you@company.com · IMAP", active: false },
              { label: "Vendors", meta: "vendors@company.com · Zoho", active: false },
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
          <p className="section-label">Why teams switch</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-night">
            Fully functional. Connected with anyone who emails you.
          </h2>
          <p className="mt-3 text-[16px] text-ink-muted">
            ExtractPilot is not a demo toy — prompts, models, review, webhooks, and REST are production-ready.
          </p>
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
          From messy inbox to structured workflow.
        </h2>
        <p className="mt-3 max-w-2xl text-[16px] text-ink-muted">
          Ten minutes to first live extraction. Then the same pipeline runs across every mailbox you connect.
        </p>
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
            <p className="section-label !text-white/50">Next step</p>
            <p className="mt-3 text-2xl font-bold text-white lg:text-3xl">
              Reclaim 10+ hours this week — start in 10 minutes.
            </p>
            <p className="mt-3 max-w-md text-[17px] text-white/70">
              Connect your mailboxes, save one schema, and run your first automated extract on the free tier.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/login" variant="accent" size="lg">
              Create account
            </LinkButton>
            <LinkButton href="/pricing" variant="inverse" size="lg">
              Compare plans
            </LinkButton>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink/[0.06] px-6 py-8 text-[15px] text-ink-muted">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4">
          <span>ExtractPilot — automate inbox workflows across every mailbox</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-night">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-night">
              Terms
            </Link>
            <Link href="/dashboard" className="font-semibold text-accent hover:text-accent-light">
              Dashboard ↗
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
