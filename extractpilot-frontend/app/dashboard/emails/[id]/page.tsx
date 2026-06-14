"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { formatDate } from "@/lib/format";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { EmailBodyViewer } from "@/components/email/EmailBodyViewer";
import { EmailAttachmentsPanel } from "@/components/email/EmailAttachmentsPanel";
import { useEmailDetail, usePrefetchEmailAttachments } from "@/hooks/useEmailQueries";

type DetailTab = "details" | "email" | "extracted" | "attachments";

export default function EmailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<DetailTab>("details");
  const { data, error, isLoading, isFetching } = useEmailDetail(id);

  const hasAttachments =
    (data?.attachmentCount ?? 0) > 0 || (data?.parsedJson?.attachments?.length ?? 0) > 0;
  usePrefetchEmailAttachments(id, hasAttachments);

  if (error) {
    return (
      <Panel title="Error">
        <p className="text-rose-600">{error.message}</p>
        <Link href="/dashboard/emails" className="mt-4 inline-block">
          <Button variant="secondary">Back to emails</Button>
        </Link>
      </Panel>
    );
  }

  if (isLoading && !data) {
    return <p className="text-slate-500">Loading email…</p>;
  }

  if (!data) {
    return <p className="text-slate-500">Email not found.</p>;
  }

  const tabs: Array<{ id: DetailTab; label: string; hidden?: boolean }> = [
    { id: "details", label: "Details" },
    { id: "email", label: "Full email" },
    { id: "extracted", label: "Extracted fields", hidden: !data.extracted },
    { id: "attachments", label: "Attachments", hidden: !hasAttachments },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/emails" className="text-sm font-semibold text-blue-700 hover:underline">
            ← All emails
          </Link>
          <h1 className="mt-3 font-display text-3xl font-bold text-slate-950">
            {data.subject ?? "Email detail"}
          </h1>
          <p className="mt-2 text-slate-600">{data.sender}</p>
          {isFetching && !isLoading ? (
            <p className="mt-1 text-xs text-slate-400">Refreshing…</p>
          ) : null}
        </div>
        <StatusBadge status={data.processingStatus} />
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabs
          .filter((t) => !t.hidden)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "border border-b-white border-slate-200 bg-white text-slate-950"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
      </nav>

      {tab === "details" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Message metadata">
            <dl className="grid gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Provider</dt>
                <dd className="font-medium">{data.provider}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Received</dt>
                <dd className="font-medium">{formatDate(data.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Attachments</dt>
                <dd className="font-medium">{data.attachmentCount}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Message ID</dt>
                <dd className="break-all font-mono text-xs text-slate-700">{data.messageId}</dd>
              </div>
            </dl>
          </Panel>

          {data.classificationResult ? (
            <Panel title="Classification">
              <p className="text-sm font-semibold text-slate-900">
                {data.classificationResult.relevant ? "Relevant to query" : "Not relevant"}
              </p>
              {data.classificationResult.reason ? (
                <p className="mt-2 text-sm text-slate-600">{data.classificationResult.reason}</p>
              ) : null}
            </Panel>
          ) : (
            <Panel title="Preview">
              <p className="mb-3 text-sm text-slate-600">First lines of the message:</p>
              <p className="line-clamp-6 whitespace-pre-wrap text-sm text-slate-800">
                {data.rawContent?.trim() || "No body content"}
              </p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => setTab("email")}>
                View full email
              </Button>
            </Panel>
          )}
        </div>
      ) : null}

      {tab === "email" ? (
        <Panel title="Original email">
          <EmailBodyViewer content={data.rawContent} />
        </Panel>
      ) : null}

      {tab === "extracted" && data.extracted ? (
        <Panel title="Extracted fields">
          <pre className="code-block max-h-[70vh] overflow-auto">{JSON.stringify(data.extracted, null, 2)}</pre>
        </Panel>
      ) : null}

      {tab === "attachments" && hasAttachments ? (
        <Panel title="Attachments">
          <EmailAttachmentsPanel emailId={data.id} />
        </Panel>
      ) : null}
    </div>
  );
}
