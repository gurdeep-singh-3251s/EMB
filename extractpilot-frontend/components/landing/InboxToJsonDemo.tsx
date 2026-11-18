"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { HERO_EMAIL_DEMO } from "@/lib/marketingDemo";

type InboxToJsonDemoProps = {
  className?: string;
  /** Looping motion for the marketing home hero; keep false on login/auth. */
  animated?: boolean;
};

export function InboxToJsonDemo({ className = "", animated = true }: InboxToJsonDemoProps) {
  const root = useRef<HTMLDivElement>(null);
  const sample = HERO_EMAIL_DEMO.extracted;

  useLayoutEffect(() => {
    if (!animated) return;
    const el = root.current;
    if (!el) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 2.4 });
      tl.set(".demo-json-line", { opacity: 0, x: 10 });
      tl.fromTo(".demo-envelope", { y: 0 }, { y: -3, duration: 0.35, ease: "power2.inOut" })
        .to(".demo-scan", { scaleX: 1, duration: 0.55, ease: "power2.inOut" }, "-=0.1")
        .to(".demo-json-line", { opacity: 1, x: 0, stagger: 0.1, duration: 0.35, ease: "power2.out" })
        .to(".demo-envelope", { y: 0, duration: 0.4, ease: "power2.out" }, "+=0.9")
        .to(".demo-scan", { scaleX: 0, duration: 0.3, ease: "power2.in" }, "<")
        .to(".demo-json-line", { opacity: 0, duration: 0.25, stagger: 0.05 }, "<0.1");
    }, el);

    return () => ctx.revert();
  }, [animated]);

  return (
    <div ref={root} className={`saas-card relative overflow-hidden p-6 sm:p-7 ${className}`} aria-hidden>
      <div className="border-b border-ink/[0.06] pb-4">
        <div className="flex items-center justify-between gap-3">
          <span className="section-label">Example</span>
          {animated ? <span className="pill">live preview</span> : null}
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
          Any mailbox in → reviewable JSON out. Automate the copy-paste work.
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_1.05fr]">
        <div className="demo-envelope relative min-h-[7.5rem] rounded-2xl border border-ink/[0.08] bg-paper p-4">
          <p className="text-[12px] text-ink-faint">From: {HERO_EMAIL_DEMO.sender}</p>
          <p className="mt-2 text-[15px] font-bold text-night">{HERO_EMAIL_DEMO.subject}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{HERO_EMAIL_DEMO.preview}</p>
          <div
            className="demo-scan absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-accent"
            aria-hidden
          />
        </div>

        <pre className="min-h-[7.5rem] rounded-2xl border border-ink/10 bg-panel-strong p-4 font-mono text-[12px] leading-relaxed text-panel-strong-fg/90">
          <span className="text-accent-light">{"{"}</span>
          {"\n"}
          <span className="demo-json-line block pl-2">
            <span className="text-white/45">supplier:</span> {sample.supplier},
          </span>
          <span className="demo-json-line block pl-2">
            <span className="text-white/45">document_ref:</span> {sample.document_ref},
          </span>
          <span className="demo-json-line block pl-2">
            <span className="text-white/45">total_usd:</span> {sample.total_usd},
          </span>
          <span className="demo-json-line block pl-2">
            <span className="text-white/45">due_date:</span> {sample.due_date}
          </span>
          {"\n"}
          <span className="text-accent-light">{"}"}</span>
        </pre>
      </div>
    </div>
  );
}
