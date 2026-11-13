import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants = {
  primary:
    "bg-night text-paper shadow-sm hover:bg-night/90 focus-visible:ring-night disabled:bg-night/40 active:scale-[0.98]",
  accent:
    "bg-accent text-white shadow-glow hover:bg-accent-light focus-visible:ring-accent disabled:bg-accent/50 active:scale-[0.98]",
  secondary:
    "border border-ink/10 bg-paper-elevated text-ink hover:border-ink/15 hover:bg-paper focus-visible:ring-ink/20 active:scale-[0.98]",
  ghost: "text-ink-muted hover:bg-ink/5 hover:text-ink focus-visible:ring-ink/20 active:scale-[0.98]",
  danger: "bg-rose-700 text-paper hover:bg-rose-800 focus-visible:ring-rose-700 active:scale-[0.98]",
};

const sizes = {
  sm: "h-10 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-7 text-base",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
