"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type EmailBodyViewerProps = {
  content: string | null;
  emptyMessage?: string;
};

export function EmailBodyViewer({
  content,
  emptyMessage = "No body content was captured for this message.",
}: EmailBodyViewerProps) {
  const [expanded, setExpanded] = useState(false);
  const text = content?.trim() || emptyMessage;
  const charCount = (content ?? "").length;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">Message body (as ingested)</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{charCount.toLocaleString()} characters</span>
          {charCount > 0 ? (
            <Button variant="secondary" size="sm" onClick={() => setExpanded(true)}>
              View full email
            </Button>
          ) : null}
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50">
        <pre className="max-h-[min(28rem,60vh)] overflow-auto whitespace-pre-wrap p-5 font-sans text-sm leading-relaxed text-slate-800">
          {text}
        </pre>
      </div>

      {expanded ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <p className="font-display text-lg font-semibold text-slate-950">Full email</p>
              <p className="text-xs text-slate-500">{charCount.toLocaleString()} characters</p>
            </div>
            <Button variant="secondary" onClick={() => setExpanded(false)}>
              Close
            </Button>
          </div>
          <div className="flex-1 overflow-auto bg-slate-50 p-6">
            <pre className="mx-auto max-w-4xl whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
              {text}
            </pre>
          </div>
        </div>
      ) : null}
    </>
  );
}
