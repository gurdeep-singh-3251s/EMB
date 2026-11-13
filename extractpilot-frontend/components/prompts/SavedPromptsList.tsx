"use client";

import type { UserQueryRow } from "@/lib/restClient";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

export function SavedPromptsList({
  items,
  activeId,
  onSelect,
  onActivate,
}: {
  items: UserQueryRow[];
  activeId: string | null;
  onSelect: (row: UserQueryRow) => void;
  onActivate: (id: string) => void;
}) {
  return (
    <Panel title="Saved prompts" description="Every save is kept — reactivate any version">
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">No saved prompts yet.</p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {items.map((row) => {
            const isActive = row.id === activeId || row.status === "active";
            return (
              <li
                key={row.id}
                className={`rounded-lg border px-3 py-2.5 text-sm ${
                  isActive ? "border-rust/40 bg-rust/5" : "border-ink/10"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button type="button" className="text-left" onClick={() => onSelect(row)}>
                    <p className="font-medium text-ink">{row.name?.trim() || "Untitled prompt"}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{row.userQuery}</p>
                    <p className="mt-1 font-mono text-[10px] text-ink-faint">
                      {new Date(row.createdAt).toLocaleString()} · {row.status}
                    </p>
                  </button>
                  {!isActive ? (
                    <Button variant="secondary" size="sm" onClick={() => onActivate(row.id)}>
                      Activate
                    </Button>
                  ) : (
                    <span className="rounded-md bg-moss/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-moss">
                      Active
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
