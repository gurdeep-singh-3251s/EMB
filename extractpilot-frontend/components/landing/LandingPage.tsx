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

const steps = [
  {
    n: "1",
    title: "Connect your inbox",
    body: "Use Gmail, Outlook, or any IMAP account. Messages stay in your workspace — we don’t mix customers.",
  },
  {
    n: "2",
    title: "Say what to capture",
    body: "List the fields you care about (reference number, amount, due date…). That becomes a JSON schema the AI must follow.",
  },
  {
    n: "3",
    title: "Review and use the data",
    body: "We fetch mail, extract values, and show results you can fix. Then export, call the API, or send webhooks to your tools.",
  },
];

const proofs = [
  { k: "Free tier", v: "Start without a credit card" },
  { k: "Your schema", v: "You choose every JSON field" },
  { k: "Your data", v: "CSV, API, or webhooks out" },
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

      gsap.utils.toArray<HTMLElement>(".scroll-rise").forEach((block) => {
        gsap.from(block, {
          scrollTrigger: { trigger: block, start: "top 90%", toggleActions: "play none none none" },
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
            <Wordmark subtitle="Emails in → JSON out" />
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
        <div className="relative mx-auto grid max-w-[1120px] gap-12 px-6 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:py-24">
          <div className="hero-copy">
            <span className="pill">For ops, finance, and founder-led teams</span>
            <h1 className="mt-6 text-[2.35rem] font-extrabold leading-[1.1] tracking-tight text-night sm:text-5xl lg:text-[3.1rem]">
              Stop copying fields out of work email.
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink-muted lg:text-[18px]">
              ExtractPilot connects to your inbox, reads messages and attachments, and fills in the JSON fields{" "}
              <strong className="font-semibold text-night">you</strong> define — so invoices, POs, and updates land
              in your spreadsheet, ERP, or app without retyping.
            </p>
            <ul className="mt-6 space-y-2 text-[15px] text-ink-muted">
              <li>· Works with Gmail, Outlook, and IMAP</li>
              <li>· You review results before anything is final</li>
              <li>· Same data in the dashboard and REST API</li>
            </ul>
            <div className="mt-9 flex flex-wrap gap-3">
              <LinkButton href="/login" variant="accent" size="lg">
                Start free
              </LinkButton>
              <LinkButton href="/pricing" variant="secondary" size="lg">
                See pricing
              </LinkButton>
            </div>
          </div>
          <div className="hero-demo-wrap">
            <InboxToJsonDemo className="demo-shadow" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1120px] gap-4 px-6 py-14 lg:grid-cols-3">
        {proofs.map((p) => (
          <MotionCard key={p.k} className="scroll-rise saas-card p-8">
            <p className="text-lg font-bold text-night">{p.k}</p>
            <p className="mt-2 text-[16px] leading-relaxed text-ink-muted">{p.v}</p>
          </MotionCard>
        ))}
      </section>

      <section className="scroll-rise mx-auto max-w-[1120px] px-6 pb-6">
        <p className="section-label">How it works</p>
        <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-night">
          Three steps, same flow every time.
        </h2>
        <p className="mt-3 max-w-2xl text-[16px] text-ink-muted">
          No jargon: connect mail → describe fields → get JSON you can trust.
        </p>
      </section>

      <section className="mx-auto grid max-w-[1120px] gap-4 px-6 pb-20 lg:grid-cols-3">
        {steps.map((s) => (
          <MotionCard key={s.n} className="scroll-rise saas-card flex flex-col p-8">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
              {s.n}
            </span>
            <h3 className="mt-4 text-xl font-bold text-night">{s.title}</h3>
            <p className="mt-3 flex-1 text-[16px] leading-relaxed text-ink-muted">{s.body}</p>
            <Link href="/dashboard/workflow" className="link-arrow mt-8">
              Open setup guide <span aria-hidden>↗</span>
            </Link>
          </MotionCard>
        ))}
      </section>

      <section className="scroll-rise saas-card-dark mx-6 mb-16 max-w-[1120px] lg:mx-auto">
        <div className="flex flex-col items-start justify-between gap-8 p-10 sm:p-12 lg:flex-row lg:items-center">
          <div>
            <p className="section-label !text-white/50">Next step</p>
            <p className="mt-3 text-2xl font-bold text-white lg:text-3xl">Try it on your own mail in minutes.</p>
            <p className="mt-3 max-w-md text-[17px] text-white/70">
              Sign in, connect a mailbox, and run one extraction on the free tier. Upgrade only when you need more
              volume.
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
          <span>ExtractPilot — structured data from email</span>
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
