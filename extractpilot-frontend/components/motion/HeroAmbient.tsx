"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

/** Soft gradient orbs — motion only, no layout shift */
export function HeroAmbient() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const orbs = root.querySelectorAll<HTMLElement>(".ambient-orb");
    const ctx = gsap.context(() => {
      orbs.forEach((orb, i) => {
        gsap.to(orb, {
          x: i % 2 === 0 ? 28 : -22,
          y: i % 2 === 0 ? -18 : 24,
          duration: 7 + i * 1.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        gsap.to(orb, {
          scale: 1.08,
          duration: 5 + i,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.4,
        });
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="ambient-orb absolute -left-24 top-8 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      <div className="ambient-orb absolute right-0 top-1/3 h-80 w-80 rounded-full bg-night/5 blur-3xl" />
      <div className="ambient-orb absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-accent-soft/80 blur-3xl" />
    </div>
  );
}
