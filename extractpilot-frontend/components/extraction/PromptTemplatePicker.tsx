"use client";

import { PROMPT_TEMPLATES, type PromptTemplate } from "@repo/config/promptTemplates";
import type { FieldSpec } from "@/lib/restClient";

export function PromptTemplatePicker({
  onApply,
}: {
  onApply: (template: { userQuery: string; outputSchema: Record<string, FieldSpec> }) => void;
}) {
  const realEstate = PROMPT_TEMPLATES.filter((t) => t.category === "Real estate");
  const other = PROMPT_TEMPLATES.filter((t) => t.category !== "Real estate");

  function renderGrid(templates: PromptTemplate[], emphasize = false) {
    return (
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`rounded-2xl border p-3.5 text-left transition ${
              emphasize
                ? "border-accent/25 bg-accent-soft/40 hover:border-accent/40 hover:bg-accent-soft/70"
                : "border-ink/10 bg-paper-elevated hover:border-ink/20 hover:bg-paper"
            }`}
            onClick={() =>
              onApply({
                userQuery: t.userQuery,
                outputSchema: t.outputSchema as Record<string, FieldSpec>,
              })
            }
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">{t.category}</span>
            <p className="mt-1 font-semibold text-night">{t.name}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{t.description}</p>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-5 space-y-4">
      <div>
        <p className="text-[15px] font-semibold text-night">Real-estate starter prompts</p>
        <p className="mt-1 text-[13px] text-ink-muted">
          One click loads a schema managers can demo — buyer leads, listings, showings, offers, escrow.
        </p>
      </div>
      {renderGrid(realEstate, true)}
      {other.length > 0 ? (
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink-muted">Also available</p>
          {renderGrid(other)}
        </div>
      ) : null}
    </div>
  );
}
