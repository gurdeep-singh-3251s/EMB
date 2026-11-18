"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

/** Soft gradient orbs + drifting accent ring — motion only, no layout shift */
export function HeroAmbient() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const orbs = root.querySelectorAll<HTMLElement>(".ambient-orb");
    const ctx = gsap.context(() => {
      orbs.forEach((orb, i) => {
        gsap.to(orb, {
          x: i % 2 === 0 ? 32 : -26,
          y: i % 2 === 0 ? -22 : 28,
          duration: 7 + i * 1.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        gsap.to(orb, {
          scale: 1.1,
          duration: 5 + i,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.4,
        });
      });

      gsap.to(".ambient-ring", {
        rotate: 360,
        duration: 48,
        repeat: -1,
        ease: "none",
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="ambient-orb absolute -left-24 top-8 h-80 w-80 rounded-full bg-accent/25 blur-3xl" />
      <div className="ambient-orb absolute right-[-4rem] top-1/4 h-96 w-96 rounded-full bg-sky-400/15 blur-3xl" />
      <div className="ambient-orb absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-accent-soft blur-3xl" />
      <div className="ambient-orb absolute right-1/4 bottom-8 h-56 w-56 rounded-full bg-moss/10 blur-3xl" />
      <div
        className="ambient-ring absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/10 opacity-60"
        style={{
          background:
            "conic-gradient(from 90deg, transparent 0%, rgb(var(--accent) / 0.12) 18%, transparent 36%, transparent 100%)",
        }}
      />
    </div>
  );
}
