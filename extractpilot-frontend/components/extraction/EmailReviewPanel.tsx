"use client";

import { useEffect, useMemo, useState } from "react";
import { type EmailDetail, type ExtractedRow, type FieldSpec } from "@/lib/restClient";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { HumanReviewFieldForm } from "@/components/extraction/HumanReviewFieldForm";
import { useEmailDetail, usePatchEmailExtracted } from "@/hooks/useEmailQueries";

type ReviewTab = "fields" | "email" | "attachments";

export function EmailReviewPanel({
  row,
  schema,
  onUpdated,
}: {
  row: ExtractedRow;
  schema: Record<string, FieldSpec>;
  onUpdated: (emailId: string, extracted: Record<string, unknown> | null, status: string) => void;
}) {
  const [tab, setTab] = useState<ReviewTab>("fields");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const { data: detail, error, isLoading } = useEmailDetail(row.emailId);
  const humanReview = detail?.parsedJson?.humanReview;
  const schemaKeys = useMemo(() => Object.keys(schema), [schema]);
  const fieldKeys =
    schemaKeys.length > 0
      ? schemaKeys
      : Object.keys(detail?.extracted ?? row.extracted ?? {});

  const tabs: Array<{ id: ReviewTab; label: string; count?: number }> = [
    { id: "fields", label: "Extracted fields", count: fieldKeys.length },
    { id: "email", label: "Original email" },
    {
      id: "attachments",
      label: "Attachments",
      count: detail?.parsedJson?.attachments?.length ?? row.source?.attachments?.length ?? 0,
    },
  ];

  function handleSaved(updated: EmailDetail) {
    setSaveMessage("Corrections saved");
    onUpdated(updated.id, updated.extracted, updated.processingStatus);
  }

  if (isLoading && !detail) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-500">Loading email…</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-rose-600">{error?.message ?? "Email not found"}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[480px] flex-col">
      <header className="border-b border-slate-100 px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-semibold text-slate-950">
                {detail.subject ?? "(No subject)"}
              </h2>
              <StatusBadge status={detail.processingStatus} />
              {humanReview ? (
                <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-800 ring-1 ring-violet-200">
                  Human reviewed
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-600">{detail.sender ?? "Unknown sender"}</p>
            <p className="mt-0.5 text-xs text-slate-400">Received {formatDate(detail.createdAt)}</p>
          </div>
          {saveMessage ? (
            <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800">
              {saveMessage}
            </span>
          ) : null}
        </div>

        {detail.classificationResult ? (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span className="font-medium text-slate-900">
              {detail.classificationResult.relevant ? "Relevant" : "Not relevant"}
            </span>
            {detail.classificationResult.confidence != null ? (
              <span className="text-slate-600">
                {" "}
                · {Math.round(detail.classificationResult.confidence * 100)}% confidence
              </span>
            ) : null}
            {detail.classificationResult.reason ? (
              <p className="mt-1 text-slate-600">{detail.classificationResult.reason}</p>
            ) : null}
          </div>
        ) : null}
      </header>

      <nav className="flex gap-1 border-b border-slate-100 px-4 pt-2">
        {tabs.map((t) => (
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
            {t.count != null && t.count > 0 ? (
              <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                {t.count}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === "fields" ? (
          <div className="mx-auto max-w-2xl">
            <p className="mb-4 text-sm text-slate-600">
              Verify each field against the email and attachments. Edit values the model missed or got wrong,
              then save your corrections.
            </p>
            {fieldKeys.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No schema fields defined. Add fields in Setup, or this email has no extractable data yet.
              </p>
            ) : (
              <HumanReviewFieldForm
                emailId={detail.id}
                schema={schema}
                fieldKeys={fieldKeys}
                initialValues={detail.extracted ?? {}}
                humanReview={humanReview}
                disabled={
                  detail.processingStatus === "pending" || detail.processingStatus === "processing"
                }
                onSaved={handleSaved}
              />
            )}
          </div>
        ) : null}

        {tab === "email" ? (
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Message body (as ingested)</p>
              <span className="text-xs text-slate-400">
                {(detail.rawContent ?? "").length.toLocaleString()} characters
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50">
              <pre className="max-h-[calc(100vh-22rem)] overflow-auto whitespace-pre-wrap p-5 font-sans text-sm leading-relaxed text-slate-800">
                {detail.rawContent?.trim() || "No body content was captured for this message."}
              </pre>
            </div>
          </div>
        ) : null}

        {tab === "attachments" ? (
          <div className="mx-auto max-w-3xl space-y-4">
            {(detail.parsedJson?.attachments?.length ?? 0) === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                This email has no attachments.
              </p>
            ) : (
              detail.parsedJson!.attachments.map((att) => (
                <AttachmentReviewCard
                  key={att.filename}
                  emailId={detail.id}
                  attachment={att}
                  humanCorrected={humanReview?.editedAttachments?.includes(att.filename)}
                  onSaved={handleSaved}
                  disabled={
                    detail.processingStatus === "pending" || detail.processingStatus === "processing"
                  }
                />
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AttachmentReviewCard({
  emailId,
  attachment,
  humanCorrected,
  disabled,
  onSaved,
}: {
  emailId: string;
  attachment: {
    filename: string;
    mimeType: string;
    status: string;
    data: Record<string, unknown> | null;
    error?: string;
  };
  humanCorrected?: boolean;
  disabled: boolean;
  onSaved: (detail: EmailDetail) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const patchMutation = usePatchEmailExtracted();

  useEffect(() => {
    setDraft(JSON.stringify(attachment.data ?? {}, null, 2));
    setEditing(false);
    setLocalError(null);
  }, [attachment.filename, attachment.data]);

  async function save() {
    setLocalError(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(draft) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Attachment data must be a JSON object");
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Invalid JSON");
      return;
    }

    try {
      const updated = await patchMutation.mutateAsync({
        emailId,
        body: { attachments: [{ filename: attachment.filename, data: parsed }] },
      });
      setEditing(false);
      onSaved(updated);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Save failed");
    }
  }

  const saving = patchMutation.isPending;

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div>
          <p className="font-medium text-slate-900">{attachment.filename}</p>
          <p className="text-xs text-slate-500">{attachment.mimeType}</p>
        </div>
        <div className="flex items-center gap-2">
          {humanCorrected ? (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
              Corrected
            </span>
          ) : null}
          <StatusBadge status={attachment.status} />
        </div>
      </div>
      <div className="p-4">
        {attachment.error ? (
          <p className="mb-3 text-sm text-rose-600">Extraction error: {attachment.error}</p>
        ) : null}
        {editing ? (
          <>
            <textarea
              className="input-field min-h-[160px] font-mono text-xs"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={disabled || saving}
            />
            {localError ? <p className="mt-2 text-sm text-rose-600">{localError}</p> : null}
            <div className="mt-3 flex gap-2">
              <Button variant="accent" size="sm" onClick={() => void save()} disabled={disabled || saving}>
                {saving ? "Saving…" : "Save attachment data"}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            {attachment.data && Object.keys(attachment.data).length > 0 ? (
              <pre className="code-block max-h-64 text-xs">{JSON.stringify(attachment.data, null, 2)}</pre>
            ) : (
              <p className="text-sm text-slate-500">No structured data extracted from this file yet.</p>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => setEditing(true)}
              disabled={disabled}
            >
              Edit extracted data
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
