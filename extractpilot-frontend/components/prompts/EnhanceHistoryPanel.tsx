"use client";

import { useEffect, useState } from "react";
import { restClient } from "@/lib/restClient";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

type Enhancement = {
  id: string;
  sourceDraft: string;
  enhanced: string;
  rationale: string | null;
  model: string;
  goal: string | null;
  createdAt: string;
};

export function EnhanceHistoryPanel({ onApply }: { onApply: (enhanced: string) => void }) {
  const [items, setItems] = useState<Enhancement[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    void restClient.promptStudio.enhancements().then((res) => {
      if (res.success) setItems(res.data.items as Enhancement[]);
    });
  }, []);

  return (
    <Panel title="Enhance history" description="AI rewrites you’ve run — compare draft vs enhanced">
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">No enhancements yet. Use “Enhance draft” in the editor.</p>
      ) : (
        <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
          {items.map((item) => {
            const open = expandedId === item.id;
            return (
              <li key={item.id} className="rounded-lg border border-ink/10 p-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setExpandedId(open ? null : item.id)}
                >
                  <span className="font-mono text-[10px] text-ink-muted">
                    {new Date(item.createdAt).toLocaleString()} · {item.model.split("/").pop()}
                  </span>
                  <span className="text-xs text-rust">{open ? "Hide" : "Diff"}</span>
                </button>
                {open ? (
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <DiffBlock title="Before" text={item.sourceDraft} />
                    <DiffBlock title="After" text={item.enhanced} highlight />
                  </div>
                ) : (
                  <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{item.enhanced}</p>
                )}
                {item.rationale ? <p className="mt-2 text-xs italic text-ink-muted">{item.rationale}</p> : null}
                <Button variant="secondary" size="sm" className="mt-2" onClick={() => onApply(item.enhanced)}>
                  Use enhanced text
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function DiffBlock({ title, text, highlight }: { title: string; text: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-2 ${highlight ? "border-rust/30 bg-rust/5" : "border-ink/10 bg-paper-elevated"}`}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-ink">{text}</p>
    </div>
  );
}
