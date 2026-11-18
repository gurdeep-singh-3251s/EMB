type LogoMarkProps = {
  className?: string;
  size?: "sm" | "md";
  onDark?: boolean;
};

export function LogoMark({ className = "", size = "md", onDark = false }: LogoMarkProps) {
  const dim = size === "sm" ? 36 : 44;
  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      className={className}
    >
      <rect width="40" height="40" rx="12" className={onDark ? "fill-paper" : "fill-inverse"} />
      <path
        d="M8 14h24v16H8V14z"
        className={onDark ? "stroke-night" : "stroke-inverse-fg"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 14l12 9 12-9"
        className={onDark ? "stroke-night" : "stroke-inverse-fg"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="23" y="22" width="7" height="5" rx="1" className="fill-accent" />
      <path
        d="M25 24.5h3M25 26h2"
        className={onDark ? "stroke-night" : "stroke-inverse-fg"}
        strokeWidth="0.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({ subtitle, onDark = false }: { subtitle?: string; onDark?: boolean }) {
  return (
    <div>
      <p
        className={`font-display text-sm font-extrabold uppercase tracking-[0.16em] lg:text-[15px] ${
          onDark ? "text-paper" : "text-night"
        }`}
      >
        ExtractPilot
      </p>
      {subtitle ? (
        <p className={`mt-0.5 text-[13px] font-medium leading-tight ${onDark ? "text-paper/60" : "text-ink-muted"}`}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
