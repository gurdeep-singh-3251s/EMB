import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants = {
  primary:
    "bg-slate-950 text-white shadow-sm hover:bg-slate-800 focus-visible:ring-slate-950 disabled:bg-slate-400 active:scale-[0.98]",
  accent:
    "bg-blue-600 text-white shadow-glow hover:bg-blue-700 focus-visible:ring-blue-600 disabled:bg-blue-300 active:scale-[0.98]",
  secondary:
    "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus-visible:ring-slate-400 active:scale-[0.98]",
  ghost: "text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-300 active:scale-[0.98]",
  danger: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-600 active:scale-[0.98]",
};

const sizes = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-sm",
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
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
