import { statusTone } from "@/lib/format";

const tones = {
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  warning: "bg-amber-50 text-amber-900 ring-amber-200",
  danger: "bg-rose-50 text-rose-800 ring-rose-200",
  info: "bg-moss/10 text-moss ring-moss/25",
  neutral: "bg-ink/5 text-ink-muted ring-ink/10",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = statusTone(status);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${tones[tone]}`}
    >
      {status}
    </span>
  );
}
