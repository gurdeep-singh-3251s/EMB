"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

export function MotionCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const enter = () => {
      gsap.to(el, { y: -5, boxShadow: "0 20px 50px -20px rgba(15,23,42,0.18)", duration: 0.35, ease: "power2.out" });
    };
    const leave = () => {
      gsap.to(el, { y: 0, boxShadow: "0 2px 4px rgba(15,23,42,0.04), 0 16px 48px -16px rgba(15,23,42,0.1)", duration: 0.4, ease: "power2.out" });
    };

    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mouseenter", enter);
      el.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
