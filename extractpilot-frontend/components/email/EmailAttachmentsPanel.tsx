"use client";

import { useState } from "react";
import { restClient, type StoredEmailAttachment } from "@/lib/restClient";
import { resolveApiKey } from "@/lib/apiClient";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useEmailAttachments } from "@/hooks/useEmailQueries";

function formatBytes(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentCard({
  emailId,
  attachment,
}: {
  emailId: string;
  attachment: StoredEmailAttachment;
}) {
  const [showText, setShowText] = useState(false);
  const [showData, setShowData] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function downloadFile() {
    if (!attachment.id) return;
    setDownloading(true);
    try {
      const url = restClient.emails.attachmentDownloadUrl(emailId, attachment.id);
      const headers: Record<string, string> = {};
      const apiKey = resolveApiKey();
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = attachment.filename;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setDownloading(false);
    }
  }

  const previewText = attachment.extractedText?.trim() ?? "";

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{attachment.filename}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {attachment.mimeType} · {formatBytes(attachment.sizeBytes)}
            {attachment.extractSource ? ` · ${attachment.extractSource}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={attachment.processingStatus} />
          {attachment.downloadable && attachment.id ? (
            <Button variant="secondary" size="sm" onClick={() => void downloadFile()} disabled={downloading}>
              {downloading ? "Downloading…" : "Download file"}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 p-4">
        {attachment.errorMessage ? (
          <p className="text-sm text-rose-600">{attachment.errorMessage}</p>
        ) : null}

        {previewText ? (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-700">Extracted text</p>
              <Button variant="secondary" size="sm" onClick={() => setShowText((v) => !v)}>
                {showText ? "Hide" : "View text"}
              </Button>
            </div>
            {showText ? (
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
                {previewText}
              </pre>
            ) : (
              <p className="line-clamp-3 text-sm text-slate-600">{previewText}</p>
            )}
          </div>
        ) : null}

        {attachment.extractedData && Object.keys(attachment.extractedData).length > 0 ? (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-700">Structured extraction</p>
              <Button variant="secondary" size="sm" onClick={() => setShowData((v) => !v)}>
                {showData ? "Hide" : "View JSON"}
              </Button>
            </div>
            {showData ? (
              <pre className="code-block max-h-64 overflow-auto text-xs">
                {JSON.stringify(attachment.extractedData, null, 2)}
              </pre>
            ) : null}
          </div>
        ) : !previewText ? (
          <p className="text-sm text-slate-500">No extracted content yet for this attachment.</p>
        ) : null}
      </div>
    </article>
  );
}

export function EmailAttachmentsPanel({ emailId }: { emailId: string }) {
  const { data: attachments, error, isLoading, isFetching } = useEmailAttachments(emailId);

  if (isLoading && !attachments) {
    return <p className="text-sm text-slate-500">Loading attachments…</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-600">{error.message}</p>;
  }

  if (!attachments?.length) {
    return <p className="text-sm text-slate-500">No attachments for this email.</p>;
  }

  return (
    <div className="space-y-4">
      {isFetching && !isLoading ? (
        <p className="text-xs text-slate-400">Refreshing attachments…</p>
      ) : null}
      {attachments.map((att) => (
        <AttachmentCard key={att.id ?? att.filename} emailId={emailId} attachment={att} />
      ))}
    </div>
  );
}
