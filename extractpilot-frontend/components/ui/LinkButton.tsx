"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

const variants = {
  primary: "bg-night text-paper hover:bg-night/90 active:scale-[0.98]",
  accent: "bg-accent text-white hover:bg-accent-light shadow-glow active:scale-[0.98]",
  secondary:
    "border border-ink/10 bg-paper-elevated text-ink hover:border-ink/15 hover:bg-paper active:scale-[0.98]",
  ghost: "text-ink-muted hover:bg-ink/5 hover:text-ink active:scale-[0.98]",
  inverse:
    "border border-paper/20 bg-paper/10 text-paper hover:border-paper/35 hover:bg-paper/15 active:scale-[0.98]",
  ghostOnDark: "text-paper/75 hover:text-paper hover:bg-paper/10 active:scale-[0.98]",
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
