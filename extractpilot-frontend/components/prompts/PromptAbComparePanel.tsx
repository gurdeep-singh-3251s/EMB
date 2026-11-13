"use client";

import { useEffect, useState } from "react";
import { restClient, type UserQueryRow } from "@/lib/restClient";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

type FieldDiff = {
  field: string;
  valueA: unknown;
  valueB: unknown;
  match: boolean;
};

export function PromptAbComparePanel({ saved, emailId }: { saved: UserQueryRow[]; emailId: string }) {
  const [promptAId, setPromptAId] = useState("");
  const [promptBId, setPromptBId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<FieldDiff[] | null>(null);

  useEffect(() => {
    if (saved.length >= 2) {
      setPromptAId(saved[0]?.id ?? "");
      setPromptBId(saved[1]?.id ?? "");
    }
  }, [saved]);

  async function runCompare() {
    if (!emailId || !promptAId || !promptBId || promptAId === promptBId) {
      setError("Pick two different saved prompts and an email.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await restClient.promptStudio.abCompare({ emailId, promptAId, promptBId });
    setLoading(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    setDiffs(res.data.fieldDiffs as FieldDiff[]);
  }

  return (
    <Panel
      title="A/B compare"
      description="Run two saved prompts on the same email (Premium+). Uses live LLM calls — counts toward usage."
    >
      <label className="block text-sm">
        <span className="font-medium text-ink">Email ID</span>
        <input className="input-field mt-1 font-mono text-xs" value={emailId} readOnly />
        <span className="mt-1 block text-[11px] text-ink-muted">Paste from Results or pick an email below in Results panel.</span>
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <PromptSelect label="Prompt A" value={promptAId} onChange={setPromptAId} saved={saved} />
        <PromptSelect label="Prompt B" value={promptBId} onChange={setPromptBId} saved={saved} />
      </div>
      <Button variant="accent" size="sm" className="mt-4" disabled={loading} onClick={() => void runCompare()}>
        {loading ? "Comparing…" : "Run compare"}
      </Button>
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
      {diffs ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-ink/10 text-ink-muted">
                <th className="py-2 pr-2">Field</th>
                <th className="py-2 pr-2">A</th>
                <th className="py-2 pr-2">B</th>
                <th className="py-2">Match</th>
              </tr>
            </thead>
            <tbody>
              {diffs.map((d) => (
                <tr key={d.field} className="border-b border-ink/5">
                  <td className="py-2 pr-2 font-mono">{d.field}</td>
                  <td className="py-2 pr-2">{formatVal(d.valueA)}</td>
                  <td className="py-2 pr-2">{formatVal(d.valueB)}</td>
                  <td className="py-2">{d.match ? "✓" : "≠"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}

function PromptSelect({
  label,
  value,
  onChange,
  saved,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  saved: UserQueryRow[];
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-ink">{label}</span>
      <select className="input-field mt-1" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {saved.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name?.trim() || p.userQuery.slice(0, 40)}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.length > 48 ? `${v.slice(0, 48)}…` : v;
  return JSON.stringify(v);
}
