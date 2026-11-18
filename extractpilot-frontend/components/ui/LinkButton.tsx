"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

const variants = {
  primary: "bg-inverse text-inverse-fg hover:bg-inverse/90 active:scale-[0.98]",
  accent: "bg-accent text-white hover:bg-accent-light shadow-glow active:scale-[0.98]",
  secondary:
    "border border-ink/10 bg-paper-elevated text-ink hover:border-ink/15 hover:bg-paper active:scale-[0.98]",
  ghost: "text-ink-muted hover:bg-ink/5 hover:text-ink active:scale-[0.98]",
  inverse:
    "border border-panel-strong-fg/20 bg-panel-strong-fg/10 text-panel-strong-fg hover:border-panel-strong-fg/35 hover:bg-panel-strong-fg/15 active:scale-[0.98]",
  ghostOnDark: "text-panel-strong-fg/75 hover:text-panel-strong-fg hover:bg-panel-strong-fg/10 active:scale-[0.98]",
};

const sizes = {
  sm: "h-10 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-7 text-base",
};

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-200 ease-premium ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}
