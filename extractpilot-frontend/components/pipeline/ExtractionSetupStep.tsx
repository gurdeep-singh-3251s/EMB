"use client";

import { useEffect, useState } from "react";
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

const TEMPLATE_SCHEMA: Record<string, FieldSpec> = {
  customer_name: { type: "string", nullable: true, description: "Customer or company name" },
  invoice_number: { type: "string", nullable: true, description: "Invoice or PO reference" },
  priority: { type: "string", nullable: true, description: "Urgency level" },
};

const DEFAULT_ROWS: SchemaRow[] = schemaToRows(TEMPLATE_SCHEMA);

export function ExtractionSetupStep({ onComplete }: { onComplete?: () => void }) {
  const [query, setQuery] = useState(
    "Extract billing and order details from customer emails and attached invoices.",
  );
  const [rows, setRows] = useState<SchemaRow[]>(DEFAULT_ROWS);
  const [loading, setLoading] = useState(true);
  const [loadedFromServer, setLoadedFromServer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void restClient.userQuery.current().then((res) => {
      if (res.success && res.data) {
        setQuery(res.data.userQuery);
        const normalized = normalizeOutputSchema(res.data.outputSchema as Record<string, unknown>);
        const schemaRows = schemaToRows(normalized);
        if (schemaRows.length > 0) {
          setRows(schemaRows);
          setLoadedFromServer(true);
        }
      }
      setLoading(false);
    });
  }, []);

  function resetToTemplate() {
    setRows(schemaToRows(TEMPLATE_SCHEMA));
    setLoadedFromServer(false);
    setMessage(null);
    setError(null);
  }

  async function save() {
    if (!query.trim()) {
      setError("Business query cannot be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    const outputSchema = rowsToSchema(rows);
    if (Object.keys(outputSchema).length === 0) {
      setError("Add at least one schema field.");
      setSaving(false);
      return;
    }
    const res = await restClient.userQuery.create({ userQuery: query.trim(), outputSchema });
    setSaving(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    setLoadedFromServer(true);
    setMessage(
      "Extraction query saved and set as active. Run extract again — existing emails will be re-processed with this query.",
    );
    onComplete?.();
  }

  return (
    <div className="space-y-4">
      <Panel title="Business query" description="Natural language instructions for the extraction pipeline">
        <textarea
          className="input-field min-h-32 resize-y"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
        />
      </Panel>
      <Panel
        title="Output schema"
        description="Fields the model must return (top-level JSON keys)"
      >
        {loading ? (
          <p className="text-sm text-slate-500">Loading your active schema…</p>
        ) : (
          <>
            {loadedFromServer ? (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-950">
                <span>
                  Loaded active query ({rows.length} field{rows.length === 1 ? "" : "s"}) from your workspace.
                </span>
                <Button variant="secondary" size="sm" onClick={resetToTemplate}>
                  Reset to starter template
                </Button>
              </div>
            ) : null}
            <SchemaBuilder rows={rows} onChange={setRows} />
            <pre className="code-block mt-4 max-h-48">{JSON.stringify(rowsToSchema(rows), null, 2)}</pre>
          </>
        )}
      </Panel>
      <div className="flex items-center gap-4">
        <Button variant="accent" onClick={save} disabled={saving || loading}>
          {saving ? "Saving…" : "Save & activate query"}
        </Button>
        {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      </div>
    </div>
  );
}
