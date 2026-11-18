"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PROMPT_TEMPLATES } from "@repo/config/promptTemplates";
import type { FieldSpec } from "@/lib/restClient";
import { Button } from "@/components/ui/Button";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMine(loadUserTemplates());
    setMsg(null);
  }, [open]);

  const starters = useMemo(
    () =>
      PROMPT_TEMPLATES.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        userQuery: t.userQuery,
        outputSchema: t.outputSchema as Record<string, FieldSpec>,
      })),
    [],
  );

  function startCreateFromCurrent() {
    setTab("mine");
    setEditingId(null);
    setName("My template");
    setDescription("Saved from Get started");
    setQuery(current.userQuery);
  }

  function startEdit(tpl: ManagedTemplate) {
    setEditingId(tpl.id);
    setName(tpl.name);
    setDescription(tpl.description);
    setQuery(tpl.userQuery);
    setTab("mine");
  }

  function saveMine() {
    if (!query.trim()) {
      setMsg("Write the requirements text before saving.");
      return;
    }
    const items = upsertUserTemplate({
      id: editingId ?? undefined,
      name,
      description,
      userQuery: query.trim(),
      outputSchema: editingId
        ? mine.find((t) => t.id === editingId)?.outputSchema ?? current.outputSchema
        : current.outputSchema,
    });
    setMine(items);
    setEditingId(items[0]?.id ?? null);
    setMsg("Template saved.");
  }

  function removeMine(id: string) {
    setMine(deleteUserTemplate(id));
    if (editingId === id) {
      setEditingId(null);
      setName("");
      setDescription("");
      setQuery("");
    }
    setMsg("Template deleted.");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-night/40 p-4 sm:items-center" role="dialog" aria-modal>
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] border border-ink/10 bg-paper shadow-ledger-lg">
        <div className="flex items-start justify-between gap-4 border-b border-ink/[0.07] px-5 py-4 sm:px-6">
          <div>
            <p className="section-label-accent">Templates</p>
            <h2 className="mt-1 text-xl font-bold text-night">Start from a template — or build your own</h2>
            <p className="mt-1 text-[14px] text-ink-muted">Select, create, edit, or delete. Your custom templates stay in this browser.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="flex gap-2 border-b border-ink/[0.07] px-5 pt-3 sm:px-6">
          <TabButton active={tab === "starters"} onClick={() => setTab("starters")}>
            Starters
          </TabButton>
          <TabButton active={tab === "mine"} onClick={() => setTab("mine")}>
            My templates ({mine.length})
          </TabButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {tab === "starters" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {starters.map((t) => (
                <article key={t.id} className="saas-card flex flex-col p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">{t.category}</p>
                  <h3 className="mt-1 font-bold text-night">{t.name}</h3>
                  <p className="mt-1 flex-1 text-[13px] leading-relaxed text-ink-muted">{t.description}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3 w-fit"
                    onClick={() => {
                      onApply({
                        userQuery: t.userQuery,
                        outputSchema: t.outputSchema,
                        name: t.name,
                      });
                      onClose();
                    }}
                  >
                    Use template
                  </Button>
                </article>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="saas-card space-y-3 p-4">
                <p className="text-[14px] font-semibold text-night">
                  {editingId ? "Edit template" : "Create template"}
                </p>
                <input
                  className="input-field"
                  placeholder="Template name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  className="input-field"
                  placeholder="Short description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <textarea
                  className="input-field min-h-24 resize-y"
                  placeholder="Requirements text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button variant="accent" size="sm" onClick={saveMine}>
                    {editingId ? "Save changes" : "Save template"}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={startCreateFromCurrent}>
                    Use current editor
                  </Button>
                  {editingId ? (
                    <Button variant="ghost" size="sm" onClick={() => removeMine(editingId)}>
                      Delete
                    </Button>
                  ) : null}
                </div>
              </div>

              {mine.length === 0 ? (
                <p className="text-[14px] text-ink-muted">No custom templates yet. Save one from your current requirements.</p>
              ) : (
                <ul className="space-y-3">
                  {mine.map((t) => (
                    <li key={t.id} className="saas-card p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-night">{t.name}</p>
                          <p className="mt-1 text-[13px] text-ink-muted">{t.description || "Custom template"}</p>
                          <p className="mt-2 line-clamp-2 text-[13px] text-ink-faint">{t.userQuery}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="accent"
                            size="sm"
                            onClick={() => {
                              onApply({
                                userQuery: t.userQuery,
                                outputSchema: t.outputSchema,
                                name: t.name,
                              });
                              onClose();
                            }}
                          >
                            Use
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => startEdit(t)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => removeMine(t.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {msg ? <p className="mt-4 text-[14px] font-medium text-moss">{msg}</p> : null}
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
      className={`border-b-2 px-3 pb-3 text-[14px] font-semibold transition ${
        active ? "border-accent text-night" : "border-transparent text-ink-muted hover:text-night"
      }`}
    >
      {children}
    </button>
  );
}
