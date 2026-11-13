"use client";

import { PROMPT_TEMPLATES, type PromptTemplate } from "@repo/config/promptTemplates";
import type { FieldSpec } from "@/lib/restClient";

export function PromptTemplatePicker({
  onApply,
}: {
  onApply: (template: { userQuery: string; outputSchema: Record<string, FieldSpec> }) => void;
}) {
  return (
    <div className="mb-4 space-y-3">
      <p className="text-sm font-semibold text-slate-800">Starter prompts (industry templates)</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PROMPT_TEMPLATES.map((t: PromptTemplate) => (
          <button
            key={t.id}
            type="button"
            className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-400 hover:shadow-sm"
            onClick={() =>
              onApply({
                userQuery: t.userQuery,
                outputSchema: t.outputSchema as Record<string, FieldSpec>,
              })
            }
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.category}</span>
            <p className="mt-1 font-semibold text-slate-900">{t.name}</p>
            <p className="mt-1 text-xs text-slate-600">{t.description}</p>
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">Unique to ExtractPilot: one-click schemas tuned for real inbox workflows.</p>
    </div>
  );
}
