"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExtractionSetupStep } from "@/components/pipeline/ExtractionSetupStep";
import { MailboxConnectStep } from "@/components/pipeline/MailboxConnectStep";
import { RunExtractionStep } from "@/components/pipeline/RunExtractionStep";
import { Panel } from "@/components/ui/Panel";
import { GuardedLink } from "@/components/ui/GuardedLink";
import { useExtractionRun } from "@/contexts/ExtractionRunContext";

const STEPS = [
  { id: 1, title: "Define extraction" },
  { id: 2, title: "Connect mailbox" },
  { id: 3, title: "Run pipeline" },
];

function WorkflowContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { isRunning } = useExtractionRun();
  const step = Math.min(3, Math.max(1, Number(params.get("step") ?? "1") || 1));

  function goToStep(next: number) {
    router.push(`/dashboard/workflow?step=${next}`);
  }

  return (
    <div className="space-y-5">
      <div className="animate-fade-in-up">
        <p className="section-label">Pipeline</p>
        <h1 className="mt-1.5 font-display text-2xl font-bold text-slate-950 lg:text-3xl">
          Setup & run extraction
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
          Three steps — then review structured output on Results.
        </p>
      </div>

      <Panel className="animate-fade-in-up stagger-1">
        <ol className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          {STEPS.map((s) => {
            const active = step === s.id;
            const done = step > s.id;
            return (
              <li key={s.id}>
                <GuardedLink
                  href={`/dashboard/workflow?step=${s.id}`}
                  className={`group flex items-center gap-2 text-sm font-semibold transition-colors duration-200 ${
                    active ? "text-blue-700" : isRunning ? "text-slate-400" : "text-slate-600 hover:text-slate-950"
                  }`}
                  aria-disabled={isRunning && !active}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-all duration-300 ease-premium ${
                      active
                        ? "bg-slate-950 text-white shadow-sm scale-105"
                        : done
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 group-hover:bg-slate-200"
                    }`}
                  >
                    {done ? "✓" : s.id}
                  </span>
                  {s.title}
                </GuardedLink>
              </li>
            );
          })}
        </ol>
      </Panel>

      <div key={step} className="animate-fade-in-up">
        {step === 1 ? (
          <ExtractionSetupStep onComplete={() => goToStep(2)} />
        ) : step === 2 ? (
          <MailboxConnectStep onComplete={() => goToStep(3)} />
        ) : (
          <RunExtractionStep />
        )}
      </div>

      <div className="flex justify-between border-t border-slate-200 pt-4 animate-fade-in-up stagger-2">
        {step > 1 ? (
          <GuardedLink
            href={`/dashboard/workflow?step=${step - 1}`}
            className="text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950"
          >
            ← Previous
          </GuardedLink>
        ) : (
          <span />
        )}
        {step < 3 ? (
          <GuardedLink
            href={`/dashboard/workflow?step=${step + 1}`}
            className="text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800"
          >
            Next →
          </GuardedLink>
        ) : (
          <GuardedLink
            href="/dashboard/results"
            className="text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800"
          >
            View results →
          </GuardedLink>
        )}
      </div>
    </div>
  );
}

export default function WorkflowPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          Loading pipeline…
        </div>
      }
    >
      <WorkflowContent />
    </Suspense>
  );
}
