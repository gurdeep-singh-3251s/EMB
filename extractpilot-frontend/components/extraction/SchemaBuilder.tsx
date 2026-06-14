"use client";

import type { FieldSpec } from "@/lib/restClient";
import { Button } from "@/components/ui/Button";

const FIELD_TYPES: FieldSpec["type"][] = ["string", "number", "boolean", "enum", "array", "object"];
const FIELD_TYPE_SET = new Set<string>(FIELD_TYPES);

export type SchemaRow = { id: string; key: string; spec: FieldSpec };

let schemaRowIdCounter = 0;

function createSchemaRow(partial: { key: string; spec: FieldSpec }): SchemaRow {
  schemaRowIdCounter += 1;
  return { id: `schema-row-${schemaRowIdCounter}`, ...partial };
}

function isFieldSpec(value: unknown): value is FieldSpec {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const type = (value as FieldSpec).type;
  return typeof type === "string" && FIELD_TYPE_SET.has(type);
}

/** Normalize API/DB shapes: flat fields, { email: {...} }, or eval { body: {...} }. */
export function normalizeOutputSchema(raw: Record<string, unknown>): Record<string, FieldSpec> {
  let schema: Record<string, unknown> = { ...raw };

  if (schema.email && typeof schema.email === "object" && !Array.isArray(schema.email)) {
    schema = schema.email as Record<string, unknown>;
  }

  const body = schema.body;
  if (body && typeof body === "object" && !Array.isArray(body) && Object.values(body).some(isFieldSpec)) {
    schema = body as Record<string, unknown>;
  }

  const out: Record<string, FieldSpec> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (!key.trim() || !isFieldSpec(value)) continue;
    out[key] = { ...value, nullable: value.nullable ?? true };
  }
  return out;
}

export function schemaToRows(schema: Record<string, FieldSpec>): SchemaRow[] {
  return Object.entries(schema).map(([key, spec]) => createSchemaRow({ key, spec }));
}

export function SchemaBuilder({
  rows,
  onChange,
}: {
  rows: SchemaRow[];
  onChange: (rows: SchemaRow[]) => void;
}) {
  function updateRow(index: number, patch: Partial<SchemaRow>) {
    const next = [...rows];
    next[index] = { ...next[index]!, ...patch };
    onChange(next);
  }

  function updateSpec(index: number, patch: Partial<FieldSpec>) {
    const next = [...rows];
    next[index] = { ...next[index]!, spec: { ...next[index]!.spec, ...patch } };
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div
          key={row.id}
          className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 md:grid-cols-[1.2fr_1fr_1.5fr_auto]"
        >
          <input
            className="input-field"
            placeholder="field_name"
            value={row.key}
            onChange={(e) => updateRow(i, { key: e.target.value })}
          />
          <select
            className="input-field"
            value={row.spec.type}
            onChange={(e) => updateSpec(i, { type: e.target.value as FieldSpec["type"] })}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            className="input-field"
            placeholder="Description for the AI"
            value={row.spec.description ?? ""}
            onChange={(e) => updateSpec(i, { description: e.target.value })}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          onChange([
            ...rows,
            createSchemaRow({ key: "", spec: { type: "string", nullable: true, description: "" } }),
          ])
        }
      >
        + Add field
      </Button>
    </div>
  );
}

export function rowsToSchema(rows: SchemaRow[]): Record<string, FieldSpec> {
  const out: Record<string, FieldSpec> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    out[key] = { ...row.spec, nullable: row.spec.nullable ?? true };
  }
  return out;
}
