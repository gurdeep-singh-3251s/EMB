"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { restClient, type FieldSpec } from "@/lib/restClient";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import {
  SchemaBuilder,
  normalizeOutputSchema,
  rowsToSchema,
  schemaToRows,
  type SchemaRow,
} from "@/components/extraction/SchemaBuilder";
import { TemplatesManager } from "@/components/extraction/TemplatesManager";

type Snapshot = { query: string; rows: SchemaRow[] };

const EMPTY_ROWS: SchemaRow[] = [];
const HISTORY_LIMIT = 40;

export function ExtractionSetupStep({ onComplete }: { onComplete?: () => void }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<SchemaRow[]>(EMPTY_ROWS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);

  const historyRef = useRef<Snapshot[]>([]);
  const indexRef = useRef(-1);
  const skipHistoryRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(indexRef.current > 0);
    setCanRedo(indexRef.current >= 0 && indexRef.current < historyRef.current.length - 1);
  }, []);

  const pushHistory = useCallback(
    (snap: Snapshot) => {
      if (skipHistoryRef.current) return;
      const trimmed = historyRef.current.slice(0, indexRef.current + 1);
      const last = trimmed[trimmed.length - 1];
      if (last && last.query === snap.query && JSON.stringify(last.rows) === JSON.stringify(snap.rows)) {
        return;
      }
      trimmed.push({
        query: snap.query,
        rows: snap.rows.map((r) => ({ ...r, spec: { ...r.spec } })),
      });
      if (trimmed.length > HISTORY_LIMIT) trimmed.shift();
      historyRef.current = trimmed;
      indexRef.current = trimmed.length - 1;
      syncHistoryFlags();
    },
    [syncHistoryFlags],
  );

  const applySnapshot = useCallback(
    (snap: Snapshot) => {
      skipHistoryRef.current = true;
      setQuery(snap.query);
      setRows(snap.rows.map((r) => ({ ...r, spec: { ...r.spec } })));
      skipHistoryRef.current = false;
      syncHistoryFlags();
    },
    [syncHistoryFlags],
  );

  useEffect(() => {
    void restClient.userQuery.current().then((res) => {
      if (res.success && res.data) {
        const nextQuery = res.data.userQuery;
        const normalized = normalizeOutputSchema(res.data.outputSchema as Record<string, unknown>);
        const schemaRows = schemaToRows(normalized);
        setQuery(nextQuery);
        setRows(schemaRows);
        historyRef.current = [{ query: nextQuery, rows: schemaRows }];
        indexRef.current = 0;
        syncHistoryFlags();
      } else {
        historyRef.current = [{ query: "", rows: [] }];
        indexRef.current = 0;
        syncHistoryFlags();
      }
      setLoading(false);
    });
  }, [syncHistoryFlags]);

  useEffect(() => {
    if (loading) return;
    pushHistory({ query, rows });
  }, [query, rows, loading, pushHistory]);

  function undo() {
    if (indexRef.current <= 0) return;
    indexRef.current -= 1;
    const snap = historyRef.current[indexRef.current];
    if (snap) applySnapshot(snap);
  }

  function redo() {
    if (indexRef.current >= historyRef.current.length - 1) return;
    indexRef.current += 1;
    const snap = historyRef.current[indexRef.current];
    if (snap) applySnapshot(snap);
  }

  function applyTemplate(payload: {
    userQuery: string;
    outputSchema: Record<string, FieldSpec>;
  }) {
    setQuery(payload.userQuery);
    setRows(schemaToRows(payload.outputSchema));
    setMessage("Template loaded — edit freely, then save & continue.");
    setError(null);
    setRationale(null);
  }

  async function enhanceWithAi() {
    if (!query.trim()) {
      setError("Write your requirements in plain language first.");
      return;
    }
    setEnhancing(true);
    setError(null);
    setRationale(null);
    const res = await restClient.promptStudio.enhance({
      userQuery: query.trim(),
      goal: "Improve clarity and propose matching output fields",
      currentSchema: rowsToSchema(rows),
    });
    setEnhancing(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    setQuery(res.data.userQuery);
    if (res.data.outputSchema && Object.keys(res.data.outputSchema).length > 0) {
      const normalized = normalizeOutputSchema(res.data.outputSchema as Record<string, unknown>);
      setRows(schemaToRows(normalized));
    }
    setRationale(res.data.rationale ?? `Enhanced with ${res.data.modelUsed}`);
    setMessage("Requirements and fields updated — review, then save.");
  }

  async function save() {
    if (!query.trim()) {
      setError("Write your requirements before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    let outputSchema = rowsToSchema(rows);
    if (Object.keys(outputSchema).length === 0) {
      // Soft default so first-time users can save after writing NL only
      outputSchema = {
        summary: { type: "string", nullable: true, description: "Short summary of the email ask" },
        contact_name: { type: "string", nullable: true, description: "Sender or contact name" },
        contact_email: { type: "string", nullable: true, description: "Contact email if present" },
      };
      setRows(schemaToRows(outputSchema));
    }
    const res = await restClient.userQuery.create({ userQuery: query.trim(), outputSchema });
    setSaving(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    setMessage("Saved and activated. Next: connect your mailboxes.");
    onComplete?.();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label-accent">Step 1</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-night">Write down your requirements</h2>
          <p className="mt-1 max-w-2xl text-[15px] text-ink-muted">
            Describe what you want from each email in plain language. Enhance with AI to refine the text and fields.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setTemplatesOpen(true)}>
          See templates
        </Button>
      </div>

      <Panel title="Your requirements" description="Natural language — start typing">
        <div className="relative">
          <textarea
            className="input-field min-h-[11rem] resize-y pb-14 pr-14 text-[15px] leading-relaxed"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading || enhancing}
            placeholder="Example: Pull contact name, company, and deal amount from inbound sales emails. Ignore newsletters."
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
            <IconButton label="Undo" disabled={!canUndo || enhancing} onClick={undo}>
              <UndoIcon />
            </IconButton>
            <IconButton label="Redo" disabled={!canRedo || enhancing} onClick={redo}>
              <RedoIcon />
            </IconButton>
            <IconButton
              label={enhancing ? "Enhancing…" : "Enhance with AI"}
              disabled={enhancing || loading || !query.trim()}
              onClick={() => void enhanceWithAi()}
              accent
            >
              {enhancing ? <SpinnerIcon /> : <SparkleIcon />}
            </IconButton>
          </div>
        </div>
        {rationale ? <p className="mt-3 text-[13px] text-ink-muted">{rationale}</p> : null}
      </Panel>

      <Panel
        title="Output fields"
        description="What the AI should return as JSON. Enhance with AI can fill these for you."
      >
        {loading ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : (
          <SchemaBuilder rows={rows} onChange={setRows} />
        )}
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="accent" onClick={() => void save()} disabled={saving || loading}>
          {saving ? "Saving…" : "Save & continue"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setTemplatesOpen(true)}>
          Not sure? See templates
        </Button>
        {message ? <p className="text-sm font-medium text-moss">{message}</p> : null}
        {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
      </div>

      <TemplatesManager
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        current={{ userQuery: query, outputSchema: rowsToSchema(rows) }}
        onApply={applyTemplate}
      />
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
  accent,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-40 ${
        accent
          ? "border-accent/30 bg-accent text-white shadow-sm hover:bg-accent-light"
          : "border-ink/10 bg-paper-elevated text-night hover:border-ink/20 hover:bg-paper"
      }`}
    >
      {children}
    </button>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3l1.2 4.8L18 9l-4.8 1.2L12 15l-1.2-4.8L6 9l4.8-1.2L12 3z" />
      <path d="M18.5 14.5l.6 2.4 2.4.6-2.4.6-.6 2.4-.6-2.4-2.4-.6 2.4-.6.6-2.4z" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 110 12h-1" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H10a6 6 0 100 12h1" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}
