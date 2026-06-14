"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

const variants = {
  primary: "bg-slate-950 text-white hover:bg-slate-800 active:scale-[0.98]",
  accent: "bg-blue-600 text-white hover:bg-blue-700 shadow-glow active:scale-[0.98]",
  secondary:
    "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 active:scale-[0.98]",
  inverse:
    "border border-slate-500 bg-slate-800 text-white hover:border-slate-400 hover:bg-slate-700 active:scale-[0.98]",
};

const sizes = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-sm",
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
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 ease-premium ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}
