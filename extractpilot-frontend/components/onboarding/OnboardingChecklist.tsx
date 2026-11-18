"use client";

import Link from "next/link";

export function OnboardingChecklist({
  steps,
}: {
  steps: Array<{ done: boolean; label: string; href: string; detail?: string }>;
}) {
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const next = steps.find((s) => !s.done);

  if (allDone) return null;

  return (
    <section className="saas-card overflow-hidden">
      <div className="border-b border-ink/[0.06] bg-accent-soft/40 px-6 py-5 sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-label-accent">Setup · {doneCount}/{steps.length}</p>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-night">Get value in 3 steps</h2>
            <p className="mt-1 text-[15px] text-ink-muted">
              About 10 minutes. You can change prompts and mailboxes anytime.
            </p>
          </div>
          {next ? (
            <Link
              href={next.href}
              className="inline-flex h-11 items-center rounded-2xl bg-accent px-5 text-[15px] font-semibold text-white transition hover:bg-accent-light"
            >
              Continue setup
            </Link>
          ) : null}
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="divide-y divide-ink/[0.06]">
        {steps.map((step, index) => (
          <li key={step.label}>
            <Link
              href={step.href}
              className="flex items-start gap-4 px-6 py-4 transition hover:bg-paper sm:px-7"
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                  step.done
                    ? "bg-moss/15 text-moss"
                    : next?.label === step.label
                      ? "bg-inverse text-inverse-fg"
                      : "bg-ink/[0.05] text-ink-muted"
                }`}
              >
                {step.done ? "✓" : index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[15px] font-semibold ${step.done ? "text-ink-muted" : "text-night"}`}>
                  {step.label}
                </span>
                {step.detail ? (
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-muted">{step.detail}</span>
                ) : null}
              </span>
              <span className="mt-1 shrink-0 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
                {step.done ? "Done" : next?.label === step.label ? "Next" : "Later"}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
