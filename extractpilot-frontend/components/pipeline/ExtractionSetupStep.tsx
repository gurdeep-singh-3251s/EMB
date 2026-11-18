"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { restClient, type FieldSpec } from "@/lib/restClient";
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
  const rootRef = useRef<HTMLDivElement>(null);
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

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      gsap.from(".setup-pane", {
        opacity: 0,
        y: 12,
        duration: 0.4,
        stagger: 0.06,
        ease: "power3.out",
      });
      gsap.from(".setup-actionbar", {
        opacity: 0,
        y: 16,
        duration: 0.45,
        delay: 0.12,
        ease: "power3.out",
      });
      gsap.utils.toArray<HTMLElement>(".setup-scroll-rise").forEach((el) => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: "top 92%", toggleActions: "play none none none" },
          opacity: 0.35,
          y: 10,
          duration: 0.35,
          ease: "power2.out",
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

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
    setMessage("Template loaded — review fields, then continue.");
    setError(null);
    setRationale(null);
  }

  async function enhanceWithAi() {
    if (!query.trim()) {
      setError("Write your requirements first.");
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
    setMessage("Updated — review, then Save & continue.");
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
    setMessage("Saved. Next: connect mailboxes.");
    onComplete?.();
  }

  return (
    <div ref={rootRef} className="space-y-3">
      <div className="setup-pane flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-night sm:text-lg">1. Write requirements</h2>
          <p className="text-[13px] text-ink-muted">Plain language in → fields out. Use Enhance if you want help.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setTemplatesOpen(true)}>
          See templates
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 lg:items-stretch">
        <section className="setup-pane saas-card flex flex-col p-3.5 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-[13px] font-semibold text-night">Requirements</p>
              <p className="text-[12px] text-ink-muted">Natural language</p>
            </div>
            <div className="flex items-center gap-1">
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
          <textarea
            className="input-field min-h-[9.5rem] flex-1 resize-y !rounded-xl !px-3 !py-2.5 text-[14px] leading-relaxed lg:min-h-[12rem]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading || enhancing}
            placeholder="e.g. Pull contact name, company, and amount from inbound sales emails. Ignore newsletters."
          />
          {rationale ? <p className="mt-2 text-[12px] text-ink-muted line-clamp-2">{rationale}</p> : null}
        </section>

        <section className="setup-pane setup-scroll-rise saas-card flex flex-col p-3.5 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-[13px] font-semibold text-night">Output fields</p>
              <p className="text-[12px] text-ink-muted">
                {rows.length} field{rows.length === 1 ? "" : "s"} · enhance can fill these
              </p>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-0.5 lg:max-h-[16.5rem]">
            {loading ? (
              <p className="text-[13px] text-ink-muted">Loading…</p>
            ) : (
              <SchemaBuilder rows={rows} onChange={setRows} compact />
            )}
          </div>
        </section>
      </div>

      <div className="setup-actionbar sticky bottom-2 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-ink/[0.08] bg-paper-elevated/95 px-3 py-2.5 shadow-ledger backdrop-blur-md">
        <Button variant="accent" size="sm" onClick={() => void save()} disabled={saving || loading}>
          {saving ? "Saving…" : "Save & continue →"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setTemplatesOpen(true)}>
          Templates
        </Button>
        {message ? <p className="text-[12px] font-medium text-moss">{message}</p> : null}
        {error ? <p className="text-[12px] font-medium text-rose-700">{error}</p> : null}
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
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-40 ${
        accent
          ? "border-accent/30 bg-accent text-white hover:bg-accent-light"
          : "border-ink/10 bg-paper text-night hover:border-ink/20"
      }`}
    >
      {children}
    </button>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3l1.2 4.8L18 9l-4.8 1.2L12 15l-1.2-4.8L6 9l4.8-1.2L12 3z" />
      <path d="M18.5 14.5l.6 2.4 2.4.6-2.4.6-.6 2.4-.6-2.4-2.4-.6 2.4-.6.6-2.4z" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 110 12h-1" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H10a6 6 0 100 12h1" />
    </svg>
  );
}

function SpinnerIcon() {
  return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />;
}
