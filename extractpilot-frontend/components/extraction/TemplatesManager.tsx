"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PROMPT_TEMPLATES } from "@repo/config/promptTemplates";
import { restClient, type FieldSpec } from "@/lib/restClient";
import { Button } from "@/components/ui/Button";
import {
  SchemaBuilder,
  normalizeOutputSchema,
  rowsToSchema,
  schemaToRows,
  type SchemaRow,
} from "@/components/extraction/SchemaBuilder";
import {
  deleteUserTemplate,
  loadUserTemplates,
  upsertUserTemplate,
  type ManagedTemplate,
} from "@/lib/userTemplates";

type ApplyPayload = {
  userQuery: string;
  outputSchema: Record<string, FieldSpec>;
  name?: string;
};

type ListItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  documents?: string[];
  userQuery: string;
  outputSchema: Record<string, FieldSpec>;
  source: "starter" | "custom";
};

export function TemplatesManager({
  open,
  onClose,
  current,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  current: ApplyPayload;
  onApply: (payload: ApplyPayload) => void;
}) {
  const [mine, setMine] = useState<ManagedTemplate[]>([]);
  const [tab, setTab] = useState<"starters" | "mine">("starters");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftQuery, setDraftQuery] = useState("");
  const [draftRows, setDraftRows] = useState<SchemaRow[]>([]);
  const [customId, setCustomId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const starters: ListItem[] = useMemo(
    () =>
      PROMPT_TEMPLATES.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        documents: t.documents,
        userQuery: t.userQuery,
        outputSchema: t.outputSchema as Record<string, FieldSpec>,
        source: "starter" as const,
      })),
    [],
  );

  const mineItems: ListItem[] = useMemo(
    () =>
      mine.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description || "Custom template",
        category: "My templates",
        userQuery: t.userQuery,
        outputSchema: t.outputSchema,
        source: "custom" as const,
      })),
    [mine],
  );

  const list = tab === "starters" ? starters : mineItems;
  const selected = list.find((t) => t.id === selectedId) ?? null;
  const hasDraft = Boolean(draftQuery || draftName || draftRows.length);

  function loadIntoPreview(item: ListItem) {
    setSelectedId(item.id);
    setCustomId(item.source === "custom" ? item.id : null);
    setDraftName(item.name);
    setDraftDescription(item.description);
    setDraftQuery(item.userQuery);
    setDraftRows(schemaToRows(item.outputSchema));
    setDirty(false);
    setMsg(`Viewing “${item.name}”. Modify below, then Save or Use.`);
    setError(null);
  }

  useEffect(() => {
    if (!open) return;
    setMine(loadUserTemplates());
    setMsg(null);
    setError(null);
    const first = PROMPT_TEMPLATES[0];
    if (first) {
      loadIntoPreview({
        id: first.id,
        name: first.name,
        description: first.description,
        category: first.category,
        documents: first.documents,
        userQuery: first.userQuery,
        outputSchema: first.outputSchema as Record<string, FieldSpec>,
        source: "starter",
      });
      setTab("starters");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function markDirty() {
    setDirty(true);
  }

  function startBlank() {
    setTab("mine");
    setSelectedId(null);
    setCustomId(null);
    setDraftName("Untitled template");
    setDraftDescription("");
    setDraftQuery(current.userQuery || "");
    setDraftRows(schemaToRows(current.outputSchema));
    setDirty(true);
    setMsg("New draft from your current editor — modify, save, then use.");
  }

  async function enhanceDraft() {
    if (!draftQuery.trim()) {
      setError("Add requirements text before enhancing.");
      return;
    }
    setEnhancing(true);
    setError(null);
    const res = await restClient.promptStudio.enhance({
      userQuery: draftQuery.trim(),
      goal: "Improve this template for multi-document email + attachment extraction and refine the schema fields",
      currentSchema: rowsToSchema(draftRows),
    });
    setEnhancing(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    setDraftQuery(res.data.userQuery);
    if (res.data.outputSchema && Object.keys(res.data.outputSchema).length > 0) {
      setDraftRows(schemaToRows(normalizeOutputSchema(res.data.outputSchema as Record<string, unknown>)));
    }
    setDirty(true);
    setMsg(res.data.rationale ?? "Enhanced — review, Save, then Use.");
  }

  function saveDraft() {
    if (!draftQuery.trim()) {
      setError("Requirements text is required to save.");
      return;
    }
    const schema = rowsToSchema(draftRows);
    if (Object.keys(schema).length === 0) {
      setError("Add at least one output field before saving.");
      return;
    }
    const items = upsertUserTemplate({
      id: customId ?? undefined,
      name: draftName,
      description: draftDescription,
      userQuery: draftQuery.trim(),
      outputSchema: schema,
    });
    setMine(items);
    const saved =
      items.find((t) => t.id === customId) ??
      items.find((t) => t.name === (draftName.trim() || "Untitled template")) ??
      items[0];
    if (saved) {
      setCustomId(saved.id);
      setSelectedId(saved.id);
      setTab("mine");
    }
    setDirty(false);
    setError(null);
    setMsg("Saved. Click Use this template to load it into Get started.");
  }

  function useDraft() {
    const schema = rowsToSchema(draftRows);
    if (!draftQuery.trim()) {
      setError("Nothing to use — write requirements first.");
      return;
    }
    if (Object.keys(schema).length === 0) {
      setError("Add at least one output field (or Enhance) before using.");
      return;
    }
    onApply({
      userQuery: draftQuery.trim(),
      outputSchema: schema,
      name: draftName.trim() || undefined,
    });
    onClose();
  }

  function removeSelected() {
    if (!customId) return;
    const items = deleteUserTemplate(customId);
    setMine(items);
    setCustomId(null);
    setSelectedId(null);
    setDraftName("");
    setDraftDescription("");
    setDraftQuery("");
    setDraftRows([]);
    setMsg("Template deleted.");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-night/50 p-2 sm:items-center sm:p-4"
      role="dialog"
      aria-modal
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 flex max-h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-ink/10 bg-paper shadow-ledger-lg sm:h-[min(92dvh,900px)]">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-ink/[0.08] px-4 py-3">
          <div>
            <p className="section-label-accent">Templates</p>
            <h2 className="mt-0.5 text-lg font-bold text-night">Not sure? Browse templates</h2>
            <p className="text-[13px] text-ink-muted">
              View a template → Modify → Save → <strong className="text-night">Use this template</strong>
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </header>

        {/* Always-visible primary actions */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-ink/[0.08] bg-accent-soft/40 px-4 py-2.5">
          <Button variant="accent" size="sm" onClick={useDraft} disabled={!hasDraft}>
            Use this template
          </Button>
          <Button variant="secondary" size="sm" onClick={saveDraft} disabled={!hasDraft}>
            {customId ? "Save modifications" : "Save as my template"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={enhancing || !draftQuery.trim()}
            onClick={() => void enhanceDraft()}
          >
            {enhancing ? "Enhancing…" : "Enhance with AI"}
          </Button>
          {customId ? (
            <Button variant="ghost" size="sm" onClick={removeSelected}>
              Delete
            </Button>
          ) : null}
          {dirty ? <span className="text-[12px] font-semibold text-accent">Unsaved changes</span> : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside className="flex max-h-[34vh] w-full shrink-0 flex-col border-b border-ink/[0.08] lg:max-h-none lg:w-[320px] lg:border-b-0 lg:border-r">
            <div className="flex gap-1 px-3 pt-3">
              <TabButton active={tab === "starters"} onClick={() => setTab("starters")}>
                Starters
              </TabButton>
              <TabButton
                active={tab === "mine"}
                onClick={() => {
                  setTab("mine");
                  if (mineItems[0]) loadIntoPreview(mineItems[0]);
                }}
              >
                Mine ({mine.length})
              </TabButton>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {list.length === 0 ? (
                <p className="px-2 py-6 text-[13px] text-ink-muted">No saved templates yet.</p>
              ) : (
                list.map((item) => {
                  const active = item.id === selectedId;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-3 ${
                        active ? "border-accent/45 bg-accent-soft/60" : "border-ink/[0.08] bg-paper-elevated"
                      }`}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{item.category}</p>
                      <p className="mt-0.5 text-[13px] font-semibold text-night">{item.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-[12px] text-ink-muted">{item.description}</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <Button variant={active ? "secondary" : "accent"} size="sm" className="!h-8 !px-3 text-[12px]" onClick={() => loadIntoPreview(item)}>
                          {active ? "Viewing" : "View"}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="!h-8 !px-3 text-[12px]"
                          onClick={() => {
                            loadIntoPreview(item);
                            setMsg(`Modify “${item.name}” on the right, then Save modifications.`);
                          }}
                        >
                          Modify
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="border-t border-ink/[0.08] p-3">
              <Button variant="secondary" size="sm" className="w-full" onClick={startBlank}>
                + New from current editor
              </Button>
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-paper">
            {!hasDraft ? (
              <div className="flex flex-1 items-center justify-center p-8 text-[14px] text-ink-muted">
                Click <strong className="mx-1 text-night">View</strong> on a template to open it here.
              </div>
            ) : (
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {selected?.documents && selected.documents.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.documents.map((d) => (
                      <span key={d} className="pill !px-2.5 !py-1 !text-[10px]">
                        {d}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[12px] font-semibold text-ink-muted">Name</span>
                    <input
                      className="input-field mt-1 !rounded-xl !px-3 !py-2 text-[14px]"
                      value={draftName}
                      onChange={(e) => {
                        setDraftName(e.target.value);
                        markDirty();
                      }}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12px] font-semibold text-ink-muted">Short description</span>
                    <input
                      className="input-field mt-1 !rounded-xl !px-3 !py-2 text-[14px]"
                      value={draftDescription}
                      onChange={(e) => {
                        setDraftDescription(e.target.value);
                        markDirty();
                      }}
                    />
                  </label>
                </div>

                <div>
                  <span className="text-[12px] font-semibold text-ink-muted">Requirements (email + attachments)</span>
                  <textarea
                    className="input-field mt-1 min-h-[8rem] resize-y !rounded-xl !px-3 !py-2.5 text-[13px] leading-relaxed"
                    value={draftQuery}
                    onChange={(e) => {
                      setDraftQuery(e.target.value);
                      markDirty();
                    }}
                    placeholder="Describe what to extract from the email and every attached document…"
                  />
                </div>

                <div>
                  <span className="text-[12px] font-semibold text-ink-muted">
                    Output schema · {draftRows.length} field{draftRows.length === 1 ? "" : "s"}
                  </span>
                  <div className="mt-1.5">
                    <SchemaBuilder
                      rows={draftRows}
                      compact
                      onChange={(next) => {
                        setDraftRows(next);
                        markDirty();
                      }}
                    />
                  </div>
                </div>

                {msg ? <p className="rounded-xl bg-moss/10 px-3 py-2 text-[13px] font-medium text-moss">{msg}</p> : null}
                {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-[13px] font-medium text-rose-700">{error}</p> : null}
              </div>
            )}

            <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-ink/[0.08] bg-paper-elevated px-4 py-3">
              <Button variant="accent" size="sm" onClick={useDraft} disabled={!hasDraft}>
                Use this template
              </Button>
              <Button variant="secondary" size="sm" onClick={saveDraft} disabled={!hasDraft}>
                {customId ? "Save modifications" : "Save as my template"}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
            </footer>
          </section>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-2 py-2 text-[12px] font-semibold transition ${
        active ? "bg-inverse text-inverse-fg" : "text-ink-muted hover:bg-ink/[0.04] hover:text-night"
      }`}
    >
      {children}
    </button>
  );
}
