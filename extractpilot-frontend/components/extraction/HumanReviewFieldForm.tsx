"use client";

import { useEffect, useState } from "react";
import { type EmailDetail, type FieldSpec } from "@/lib/restClient";
import { Button } from "@/components/ui/Button";
import { usePatchEmailExtracted } from "@/hooks/useEmailQueries";

function fieldLabel(key: string, spec?: FieldSpec): string {
  if (spec?.description) return spec.description;
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatInputValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parseFieldValue(raw: string, spec?: FieldSpec): unknown {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "null") {
    return spec?.nullable !== false ? null : "";
  }
  if (spec?.type === "number") {
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : trimmed;
  }
  if (spec?.type === "boolean") {
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
  }
  return trimmed;
}

export function HumanReviewFieldForm({
  emailId,
  schema,
  fieldKeys,
  initialValues,
  humanReview,
  disabled,
  onSaved,
}: {
  emailId: string;
  schema: Record<string, FieldSpec>;
  fieldKeys: string[];
  initialValues: Record<string, unknown>;
  humanReview?: {
    lastEditedAt: string;
    editedFields: string[];
    editedAttachments?: string[];
  };
  disabled: boolean;
  onSaved: (detail: EmailDetail) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const patchMutation = usePatchEmailExtracted();

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const key of fieldKeys) {
      next[key] = formatInputValue(initialValues[key]);
    }
    setValues(next);
    setDirty(false);
    setError(null);
  }, [emailId, fieldKeys, initialValues]);

  function updateField(key: string, raw: string) {
    setValues((prev) => ({ ...prev, [key]: raw }));
    setDirty(true);
  }

  async function save() {
    setError(null);
    const fields: Record<string, unknown> = {};
    for (const key of fieldKeys) {
      fields[key] = parseFieldValue(values[key] ?? "", schema[key]);
    }

    try {
      const detail = await patchMutation.mutateAsync({ emailId, body: { fields } });
      setDirty(false);
      onSaved(detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  const saving = patchMutation.isPending;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      {fieldKeys.map((key) => {
        const spec = schema[key];
        const corrected = humanReview?.editedFields.includes(key);
        return (
          <label key={key} className="block">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-sm font-medium text-slate-800">{fieldLabel(key, spec)}</span>
              <span className="font-mono text-[11px] text-slate-400">{key}</span>
              {corrected ? (
                <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-800">
                  Corrected
                </span>
              ) : null}
            </div>
            {spec?.type === "enum" && spec.values?.length ? (
              <select
                className="input-field"
                value={values[key] ?? ""}
                onChange={(e) => updateField(key, e.target.value)}
                disabled={disabled || saving}
              >
                <option value="">—</option>
                {spec.values.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={spec?.type === "number" ? "number" : "text"}
                className="input-field"
                value={values[key] ?? ""}
                placeholder={spec?.nullable !== false ? "Leave empty if not found" : "Required"}
                onChange={(e) => updateField(key, e.target.value)}
                disabled={disabled || saving}
              />
            )}
            {spec?.description ? (
              <p className="mt-1 text-xs text-slate-500">{spec.description}</p>
            ) : null}
          </label>
        );
      })}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <Button type="submit" variant="accent" disabled={disabled || saving || !dirty}>
          {saving ? "Saving…" : "Save corrections"}
        </Button>
        {humanReview?.lastEditedAt ? (
          <p className="text-xs text-slate-500">
            Last reviewed {new Date(humanReview.lastEditedAt).toLocaleString()}
          </p>
        ) : null}
        {disabled ? (
          <p className="text-xs text-amber-700">Wait for extraction to finish before editing.</p>
        ) : null}
      </div>
    </form>
  );
}
