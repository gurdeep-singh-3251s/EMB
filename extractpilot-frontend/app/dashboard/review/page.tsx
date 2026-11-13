"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { Panel } from "@/components/ui/Panel";

type EmailListItem = {
  id: string;
  subject: string | null;
  sender: string | null;
  processingStatus: string;
  attachmentCount: number;
  createdAt: string;
};

export default function ReviewQueuePage() {
  const [partial, setPartial] = useState<EmailListItem[]>([]);
  const [failed, setFailed] = useState<EmailListItem[]>([]);

  useEffect(() => {
    void apiFetch<{ partial: EmailListItem[]; failed: EmailListItem[] }>("/api/v1/emails/review-queue").then(
      (res) => {
        if (res.success) {
          setPartial(res.data.partial);
          setFailed(res.data.failed);
        }
      },
    );
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="section-label">Quality</p>
        <h1 className="mt-1.5 font-display text-2xl font-semibold text-ink">Human review queue</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Partial extractions and failures that may need corrections before export.
        </p>
      </div>

      <Panel title={`Partial (${partial.length})`}>
        {partial.length === 0 ? (
          <p className="text-sm text-ink-muted">Nothing waiting — nice work.</p>
        ) : (
          <ul className="divide-y divide-ink/10 text-sm">
            {partial.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                <ReviewRow subject={e.subject} sender={e.sender} status={e.processingStatus} />
                <Link href={`/dashboard/emails/${e.id}`} className="text-xs font-semibold text-rust hover:underline">
                  Review →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={`Failed (${failed.length})`}>
        {failed.length === 0 ? (
          <p className="text-sm text-ink-muted">No failed emails in the review queue.</p>
        ) : (
          <ul className="divide-y divide-ink/10 text-sm">
            {failed.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                <ReviewRow subject={e.subject} sender={e.sender} status={e.processingStatus} />
                <Link href={`/dashboard/ops`} className="text-xs font-semibold text-rust hover:underline">
                  Retry in Health →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function ReviewRow({
  subject,
  sender,
  status,
}: {
  subject: string | null;
  sender: string | null;
  status: string;
}) {
  return (
    <div>
      <p className="font-medium text-ink">{subject ?? "(no subject)"}</p>
      <p className="text-xs text-ink-muted">
        {sender ?? "unknown sender"} · {status}
      </p>
    </div>
  );
}
