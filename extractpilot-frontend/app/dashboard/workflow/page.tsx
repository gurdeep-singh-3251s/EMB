"use client";

import { Suspense, useLayoutEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { ExtractionSetupStep } from "@/components/pipeline/ExtractionSetupStep";
import { MailboxConnectStep } from "@/components/pipeline/MailboxConnectStep";
import { RunExtractionStep } from "@/components/pipeline/RunExtractionStep";
import { GuardedLink } from "@/components/ui/GuardedLink";
import { useExtractionRun } from "@/contexts/ExtractionRunContext";

const STEPS = [
  { id: 1, title: "Requirements" },
  { id: 2, title: "Mailboxes" },
  { id: 3, title: "Extract" },
];

function WorkflowContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { isRunning } = useExtractionRun();
  const step = Math.min(3, Math.max(1, Number(params.get("step") ?? "1") || 1));
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  function goToStep(next: number) {
    router.push(`/dashboard/workflow?step=${next}`);
  }

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      gsap.from(".wf-chrome", {
        opacity: 0,
        y: 10,
        duration: 0.4,
        stagger: 0.05,
        ease: "power3.out",
      });
    }, root);
    return () => ctx.revert();
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        stage,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" },
      );
    }, stage);
    return () => ctx.revert();
  }, [step]);

  return (
    <div ref={rootRef} className="mx-auto flex max-w-6xl flex-col gap-3 pb-2">
      <div className="wf-chrome flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">Get started</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-night sm:text-2xl">
            Setup in 3 steps
          </h1>
        </div>
        <ol className="flex items-center gap-1 rounded-2xl border border-ink/[0.08] bg-paper-elevated p-1">
          {STEPS.map((s, i) => {
            const active = step === s.id;
            const done = step > s.id;
            return (
              <li key={s.id} className="flex items-center">
                {i > 0 ? <span className="mx-0.5 hidden h-px w-4 bg-ink/15 sm:block" aria-hidden /> : null}
                <GuardedLink
                  href={`/dashboard/workflow?step=${s.id}`}
                  className={`inline-flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-semibold transition ${
                    active
                      ? "bg-inverse text-inverse-fg"
                      : done
                        ? "text-accent hover:bg-accent-soft"
                        : isRunning
                          ? "pointer-events-none text-ink-faint"
                          : "text-ink-muted hover:bg-ink/[0.04] hover:text-night"
                  }`}
                  aria-disabled={isRunning && !active}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                      active
                        ? "bg-paper/15 text-inverse-fg"
                        : done
                          ? "bg-accent/15 text-accent"
                          : "bg-ink/[0.06] text-ink-muted"
                    }`}
                  >
                    {done ? "✓" : s.id}
                  </span>
                  <span className="hidden sm:inline">{s.title}</span>
                </GuardedLink>
              </li>
            );
          })}
        </ol>
      </div>

      <div ref={stageRef} className="wf-chrome min-h-0">
        {step === 1 ? (
          <ExtractionSetupStep onComplete={() => goToStep(2)} />
        ) : step === 2 ? (
          <MailboxConnectStep onComplete={() => goToStep(3)} />
        ) : (
          <RunExtractionStep />
        )}
      </div>

      {step !== 1 ? (
        <div className="wf-chrome flex items-center justify-between border-t border-ink/[0.07] pt-3">
          {step > 1 ? (
            <GuardedLink
              href={`/dashboard/workflow?step=${step - 1}`}
              className="text-[13px] font-semibold text-ink-muted transition hover:text-night"
            >
              ← Previous
            </GuardedLink>
          ) : (
            <span />
          )}
          {step < 3 ? (
            <GuardedLink
              href={`/dashboard/workflow?step=${step + 1}`}
              className="text-[13px] font-semibold text-accent transition hover:text-accent-light"
            >
              Next →
            </GuardedLink>
          ) : (
            <GuardedLink
              href="/dashboard/results"
              className="text-[13px] font-semibold text-accent transition hover:text-accent-light"
            >
              View results →
            </GuardedLink>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function WorkflowPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink/20 border-t-accent" />
          Loading…
        </div>
      }
    >
      <WorkflowContent />
    </Suspense>
  );
}
