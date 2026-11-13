"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { restClient, type FieldSpec, type UserQueryRow } from "@/lib/restClient";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { PromptTemplatePicker } from "@/components/extraction/PromptTemplatePicker";
import {
  SchemaBuilder,
  normalizeOutputSchema,
  rowsToSchema,
  schemaToRows,
  type SchemaRow,
} from "@/components/extraction/SchemaBuilder";
import { ModelTierPicker } from "@/components/prompts/ModelTierPicker";
import { SavedPromptsList } from "@/components/prompts/SavedPromptsList";
import { PromptResultsPanel } from "@/components/prompts/PromptResultsPanel";
import { EnhanceHistoryPanel } from "@/components/prompts/EnhanceHistoryPanel";
import { PromptAbComparePanel } from "@/components/prompts/PromptAbComparePanel";

export function PromptStudio() {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<SchemaRow[]>([]);
  const [classifyModel, setClassifyModel] = useState<string | undefined>();
  const [extractModel, setExtractModel] = useState<string | undefined>();
  const [enhanceGoal, setEnhanceGoal] = useState("");
  const [rationale, setRationale] = useState<string | null>(null);

  const [saved, setSaved] = useState<UserQueryRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [resultsForId, setResultsForId] = useState<string | "current">("current");
  const [compareEmailId, setCompareEmailId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    const [current, list] = await Promise.all([restClient.userQuery.current(), restClient.userQuery.list()]);
    if (current.success && current.data) {
      hydrateFromRow(current.data);
      setActiveId(current.data.id);
      setResultsForId(current.data.id);
    }
    if (list.success) setSaved(list.data.items);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  function hydrateFromRow(row: UserQueryRow) {
    setName(row.name ?? "");
    setQuery(row.userQuery);
    const normalized = normalizeOutputSchema(row.outputSchema as Record<string, unknown>);
    setRows(schemaToRows(normalized));
    setClassifyModel(row.classifyModel ?? undefined);
    setExtractModel(row.extractModel ?? undefined);
  }

  const outputSchema = useMemo(() => rowsToSchema(rows), [rows]);

  async function saveAndActivate() {
    if (!query.trim()) {
      setError("Write extraction instructions first.");
      return;
    }
    if (Object.keys(outputSchema).length === 0) {
      setError("Add at least one schema field.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await restClient.userQuery.create({
      name: name.trim() || undefined,
      userQuery: query.trim(),
      outputSchema,
      classifyModel,
      extractModel,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    setMessage("Saved and set active. New extractions use this prompt + models.");
    setActiveId(res.data.id);
    setResultsForId(res.data.id);
    void loadWorkspace();
  }

  async function enhanceWithAi() {
    if (!query.trim()) {
      setError("Add a draft prompt to enhance.");
      return;
    }
    setEnhancing(true);
    setError(null);
    setRationale(null);
    const res = await restClient.promptStudio.enhance({
      userQuery: query.trim(),
      goal: enhanceGoal.trim() || undefined,
      model: extractModel,
    });
    setEnhancing(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    setQuery(res.data.userQuery);
    setRationale(res.data.rationale ?? `Refined with ${res.data.modelUsed}`);
  }

  async function activateSaved(id: string) {
    const res = await restClient.userQuery.activate(id);
    if (!res.success) {
      setError(res.message);
      return;
    }
    hydrateFromRow(res.data);
    setActiveId(res.data.id);
    setResultsForId(res.data.id);
    setMessage("Reactivated saved prompt.");
    void loadWorkspace();
  }

  return (
    <div className="space-y-6">
      <StudioHeader setResultsForId={setResultsForId} resultsForId={resultsForId} activeId={activeId} />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <Panel title="Prompt editor" description="Instructions and JSON schema — versioned each time you save">
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-ink">Label (optional)</span>
                <input
                  className="input-field mt-1"
                  placeholder="e.g. Q4 invoice intake"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </label>
            </div>
            <PromptTemplatePicker
              onApply={({ userQuery, outputSchema: schema }) => {
                setQuery(userQuery);
                setRows(schemaToRows(schema));
                setMessage(null);
                setError(null);
              }}
            />
            <textarea
              className="input-field mt-3 min-h-36 resize-y"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              placeholder="Tell the pipeline what to pull from each email…"
            />
            <div className="mt-4 rounded-lg border border-ink/10 bg-paper-elevated p-3">
              <label className="block text-sm font-medium text-ink">Enhance with AI</label>
              <input
                className="input-field mt-2"
                placeholder="Optional goal (e.g. focus on line items from PDFs)"
                value={enhanceGoal}
                onChange={(e) => setEnhanceGoal(e.target.value)}
              />
              <Button variant="secondary" size="sm" className="mt-3" disabled={enhancing} onClick={() => void enhanceWithAi()}>
                {enhancing ? "Refining…" : "Enhance draft"}
              </Button>
              {rationale ? <p className="mt-2 text-xs text-ink-muted">{rationale}</p> : null}
            </div>
          </Panel>

          <ModelTierPicker
            classifyModel={classifyModel}
            extractModel={extractModel}
            onClassifyChange={setClassifyModel}
            onExtractChange={setExtractModel}
          />

          <Panel title="Output schema">
            {loading ? (
              <p className="text-sm text-ink-muted">Loading…</p>
            ) : (
              <>
                <SchemaBuilder rows={rows} onChange={setRows} />
                <pre className="code-block mt-4 max-h-40">{JSON.stringify(outputSchema, null, 2)}</pre>
              </>
            )}
          </Panel>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="accent" disabled={saving || loading} onClick={() => void saveAndActivate()}>
              {saving ? "Saving…" : "Save & activate"}
            </Button>
            {message ? <p className="text-sm font-medium text-moss">{message}</p> : null}
            {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
          </div>
        </div>

        <div className="space-y-5">
          <SavedPromptsList
            items={saved}
            activeId={activeId}
            onSelect={(row) => {
              hydrateFromRow(row);
              setResultsForId(row.id);
            }}
            onActivate={(id) => void activateSaved(id)}
          />
          <PromptResultsPanel
            userQueryId={resultsForId}
            selectedEmailId={compareEmailId}
            onSelectEmail={setCompareEmailId}
          />
          <EnhanceHistoryPanel onApply={(text) => setQuery(text)} />
          <PromptAbComparePanel saved={saved} emailId={compareEmailId} />
        </div>
      </div>
    </div>
  );
}

function StudioHeader({
  resultsForId,
  activeId,
  setResultsForId,
}: {
  resultsForId: string;
  activeId: string | null;
  setResultsForId: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="section-label">Prompt studio</p>
        <h1 className="mt-1.5 font-display text-2xl font-semibold text-ink">Manage prompts, models, and results</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Each save creates a new version. Pick models allowed on your plan — higher tiers unlock stronger extract
          models. Results stay tied to the prompt that processed the email.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {activeId ? (
          <Button variant="secondary" size="sm" onClick={() => setResultsForId(activeId)}>
            Results: active
          </Button>
        ) : null}
        <Link
          href="/dashboard/results"
          className="inline-flex h-9 items-center rounded-lg border border-ink/15 px-3 text-xs font-semibold text-ink hover:bg-paper-elevated"
        >
          Full results workbench →
        </Link>
      </div>
    </div>
  );
}
