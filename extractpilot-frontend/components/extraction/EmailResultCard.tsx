"use client";

import { useMemo, useState } from "react";
import { type EmailDetail, type ExtractedRow } from "@/lib/restClient";
import { formatDate, truncate } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { useEmailDetail } from "@/hooks/useEmailQueries";

export function EmailResultCard({ row }: { row: ExtractedRow }) {
  const [expanded, setExpanded] = useState(false);
  const hasInlineSource = Boolean(row.source?.rawContent || row.source?.attachments?.length);

  const inlineDetail = useMemo((): EmailDetail | null => {
    if (!hasInlineSource) return null;
    return {
      id: row.emailId,
      provider: "imap",
      messageId: "",
      sender: row.sender,
      subject: row.subject,
      processingStatus: row.processingStatus,
      attachmentCount: row.source!.attachments.length,
      createdAt: new Date().toISOString(),
      rawContent: row.source!.rawContent,
      userQueryId: null,
      classificationResult: null,
      parsedJson: {
        email: row.extracted ?? {},
        attachments: row.source!.attachments.map((a) => ({
          filename: a.filename,
          mimeType: a.mimeType,
          status: a.status,
          data: null,
        })),
      },
      extracted: row.extracted,
    };
  }, [hasInlineSource, row]);

  const {
    data: fetchedDetail,
    isLoading,
    error: fetchError,
  } = useEmailDetail(row.emailId, { enabled: expanded && !hasInlineSource });

  const detail = hasInlineSource ? inlineDetail : (fetchedDetail ?? null);

  function toggleExpanded() {
    setExpanded((v) => !v);
  }

  return (
    <article className="glass-panel overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-display text-lg font-semibold text-slate-950">
                {row.subject ?? "(No subject)"}
              </h3>
              <StatusBadge status={row.processingStatus} />
            </div>
            <p className="mt-1 text-sm text-slate-600">{row.sender ?? "Unknown sender"}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={toggleExpanded} disabled={isLoading}>
            {isLoading ? "Loading…" : expanded ? "Hide source" : "View source & extraction"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <div>
          <p className="section-label mb-3">Extracted fields</p>
          {row.extracted ? (
            <pre className="code-block max-h-80">{JSON.stringify(row.extracted, null, 2)}</pre>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Extraction pending or unavailable
            </p>
          )}
        </div>

        {expanded && detail ? (
          <div className="space-y-4">
            <Panel title="Received email" description="Original message as ingested from mailbox">
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-slate-500">Received</dt>
                  <dd className="font-medium text-slate-900">{formatDate(detail.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Body preview</dt>
                  <dd className="mt-1 whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-3 text-slate-800">
                    {truncate(detail.rawContent, 600) || "—"}
                  </dd>
                </div>
              </dl>
            </Panel>

            {detail.classificationResult ? (
              <Panel title="Classification">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-950">
                    {detail.classificationResult.relevant ? "Relevant" : "Not relevant"}
                  </span>
                  {detail.classificationResult.confidence != null
                    ? ` · ${Math.round(detail.classificationResult.confidence * 100)}% confidence`
                    : null}
                </p>
                {detail.classificationResult.reason ? (
                  <p className="mt-2 text-sm text-slate-600">{detail.classificationResult.reason}</p>
                ) : null}
              </Panel>
            ) : null}

            {detail.parsedJson?.attachments?.length ? (
              <Panel title={`Attachments (${detail.parsedJson.attachments.length})`}>
                <ul className="space-y-3">
                  {detail.parsedJson.attachments.map((att) => (
                    <li
                      key={att.filename}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-900">{att.filename}</span>
                        <StatusBadge status={att.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{att.mimeType}</p>
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}
          </div>
        ) : null}
      </div>

      {fetchError ? <p className="px-6 pb-4 text-sm text-rose-600">{fetchError.message}</p> : null}
    </article>
  );
}
