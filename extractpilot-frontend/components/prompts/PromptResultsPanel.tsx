"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { restClient } from "@/lib/restClient";
import { Panel } from "@/components/ui/Panel";

export function PromptResultsPanel({
  userQueryId,
  onSelectEmail,
  selectedEmailId,
}: {
  userQueryId: string;
  onSelectEmail?: (id: string) => void;
  selectedEmailId?: string;
}) {
  const [rows, setRows] = useState<Array<{ id: string; subject: string | null; status: string }>>([]);
  const [total, setTotal] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void restClient.userQuery
      .results({ limit: 8, includeInProgress: true, userQueryId })
      .then((res) => {
        if (!res.success) {
          setRows([]);
          setLoading(false);
          return;
        }
        setTotal(res.data.total);
        setCompleted(res.data.completedCount);
        setRows(
          res.data.extractedData.map((r) => ({
            id: r.emailId,
            subject: r.subject,
            status: r.processingStatus,
          })),
        );
        setLoading(false);
      });
  }, [userQueryId]);

  return (
    <Panel title="Results for this prompt" description={`${completed} completed · ${total} total emails`}>
      {loading ? (
        <p className="text-sm text-ink-muted">Loading results…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-muted">No emails linked to this prompt yet — run extract from the pipeline.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.map((r) => (
            <li key={r.id}>
              <div
                className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 ${
                  selectedEmailId === r.id ? "border-rust/40 bg-rust/5" : "border-ink/10"
                }`}
              >
                <Link href={`/dashboard/emails/${r.id}`} className="min-w-0 flex-1 truncate text-ink hover:underline">
                  {r.subject ?? "(no subject)"}
                </Link>
                <div className="flex items-center gap-2">
                  {onSelectEmail ? (
                    <button
                      type="button"
                      className="text-[10px] font-semibold uppercase text-rust"
                      onClick={() => onSelectEmail(r.id)}
                    >
                      A/B email
                    </button>
                  ) : null}
                  <span className="font-mono text-[10px] uppercase text-ink-muted">{r.status}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link href="/dashboard/results" className="mt-3 inline-block text-xs font-semibold text-rust hover:underline">
        Open full results →
      </Link>
    </Panel>
  );
}
