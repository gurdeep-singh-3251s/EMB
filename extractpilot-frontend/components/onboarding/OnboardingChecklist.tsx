"use client";

import Link from "next/link";
import { Panel } from "@/components/ui/Panel";

export function OnboardingChecklist({
  steps,
}: {
  steps: Array<{ done: boolean; label: string; href: string }>;
}) {
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  if (allDone) return null;

  return (
    <Panel title="Getting started" description={`${doneCount} of ${steps.length} complete`}>
      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.label}>
            <Link
              href={step.href}
              className="flex items-center justify-between rounded-lg border border-ink/10 px-3 py-2.5 text-sm hover:bg-paper-elevated"
            >
              <span className={step.done ? "text-ink-muted line-through" : "font-medium text-ink"}>{step.label}</span>
              <span className="font-mono text-[10px] uppercase text-ink-muted">{step.done ? "Done" : "Start"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
