"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { restClient } from "@/lib/restClient";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

type FailureRow = {
  id: string;
  emailId: string | null;
  subject: string | null;
  errorMessage: string;
  failedAt: string;
};

export default function OpsPage() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [failures, setFailures] = useState<FailureRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(() => {
    void Promise.all([restClient.ops.health(), restClient.ops.failures()]).then(([h, f]) => {
      if (h.success) setHealth(h.data as Record<string, unknown>);
      if (f.success) setFailures(f.data.items as FailureRow[]);
    });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const queue = health?.queue as Record<string, number> | undefined;

  async function retryOne(row: FailureRow) {
    if (!row.emailId) return;
    setBusy(row.id);
    setMessage(null);
    const res = await restClient.ops.retryFailure({ failedJobId: row.id });
    setBusy(null);
    setMessage(res.success ? res.message : res.message);
    reload();
  }

  async function retryAll() {
    setBusy("all");
    const res = await restClient.ops.retryAllFailures();
    setBusy(null);
    setMessage(res.message);
    reload();
  }

  async function replayDlq() {
    setBusy("dlq");
    const res = await restClient.ops.replayDlq(10);
    setBusy(null);
    setMessage(res.message);
    reload();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="section-label">Reliability</p>
        <h1 className="mt-1.5 font-display text-2xl font-semibold text-ink">Pipeline health</h1>
        <p className="mt-2 text-sm text-ink-muted">Queue, DLQ replay, and failure retries for your workspace.</p>
      </div>

      {message ? (
        <p className="rounded-lg border border-moss/30 bg-moss/10 px-3 py-2 text-sm text-ink">{message}</p>
      ) : null}

      {health ? (
        <Panel title="Snapshot">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <StatRow label="Failed extractions" value={String(health.failedExtractions ?? 0)} />
            <StatRow label="Emails processing" value={String(health.emailsProcessing ?? 0)} />
            <StatRow label="Cron enabled" value={String(health.cronEnabled)} />
            <StatRow label="Attachment mode" value={String(health.attachmentMode)} />
            <StatRow label="OCR configured" value={String(health.ocrConfigured)} />
          </dl>
          {queue ? (
            <div className="mt-4 rounded-lg border border-ink/10 p-3 text-xs font-mono text-ink-muted">
              Queue waiting {queue.waiting} · active {queue.active} · failed {queue.failed} · DLQ{" "}
              {queue.dlqWaiting}
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={busy !== null || !queue?.dlqWaiting}
              onClick={() => void replayDlq()}
            >
              {busy === "dlq" ? "Replaying…" : "Replay DLQ (your jobs)"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={busy !== null || failures.length === 0}
              onClick={() => void retryAll()}
            >
              {busy === "all" ? "Requeueing…" : "Retry all failures"}
            </Button>
          </div>
        </Panel>
      ) : null}

      <Panel title="Recent failures">
        {failures.length === 0 ? (
          <p className="text-sm text-ink-muted">No failed jobs recorded.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {failures.map((f) => (
              <li key={f.id} className="rounded-lg border border-ink/10 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium text-ink">{f.subject ?? "Email"}</p>
                  {f.emailId ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy !== null}
                      onClick={() => void retryOne(f)}
                    >
                      {busy === f.id ? "…" : "Retry"}
                    </Button>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-ink-muted line-clamp-2">{f.errorMessage}</p>
                <p className="mt-1 font-mono text-[10px] text-ink-faint">{new Date(f.failedAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
        <Link href="/dashboard/emails" className="mt-3 inline-block text-xs font-semibold text-rust hover:underline">
          View emails →
        </Link>
      </Panel>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}
