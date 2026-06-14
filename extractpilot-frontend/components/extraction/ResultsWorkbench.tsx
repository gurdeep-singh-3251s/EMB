"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildExportCsv,
  buildExportJson,
  downloadTextFile,
  exportFilename,
  fetchAllResultsForExport,
} from "@/lib/exportResults";
import {
  loadResultsWorkbenchState,
  saveResultsWorkbenchState,
} from "@/lib/resultsWorkbenchState";
import { type ExtractedRow, type FieldSpec } from "@/lib/restClient";
import { normalizeOutputSchema } from "@/components/extraction/SchemaBuilder";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmailReviewPanel } from "@/components/extraction/EmailReviewPanel";
import { useCurrentUserQuery, useUserQueryResults } from "@/hooks/useUserQueryQueries";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

const TIME_RANGES = [
  { key: "1hour", label: "Last hour" },
  { key: "1day", label: "Last 24 hours" },
  { key: "1week", label: "Last week" },
  { key: "1month", label: "Last month" },
  { key: "all", label: "All time" },
] as const;

const limit = 25;

function countByStatus(rows: ExtractedRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.processingStatus] = (counts[row.processingStatus] ?? 0) + 1;
  }
  return counts;
}

export function ResultsWorkbench() {
  const queryClient = useQueryClient();
  const persisted = useMemo(() => loadResultsWorkbenchState(), []);

  const [timeRange, setTimeRange] = useState(persisted?.timeRange ?? "all");
  const [offset, setOffset] = useState(persisted?.offset ?? 0);
  const [selectedId, setSelectedId] = useState<string | null>(persisted?.selectedId ?? null);
  const [exporting, setExporting] = useState<"csv" | "json" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const resultsParams = useMemo(
    () => ({ limit, offset, timeRange, includeInProgress: true }),
    [offset, timeRange],
  );

  const currentQuery = useCurrentUserQuery();
  const resultsQuery = useUserQueryResults(resultsParams);

  const schema = useMemo(() => {
    if (!currentQuery.data?.outputSchema) return {} as Record<string, FieldSpec>;
    return normalizeOutputSchema(currentQuery.data.outputSchema as Record<string, unknown>);
  }, [currentQuery.data?.outputSchema]);

  const rows = resultsQuery.data?.extractedData ?? [];
  const total = resultsQuery.data?.total ?? 0;
  const completedCount = resultsQuery.data?.completedCount ?? 0;
  const initialLoad = resultsQuery.isLoading && !resultsQuery.data;
  const isRefreshing = resultsQuery.isFetching && !initialLoad;
  const error = resultsQuery.error?.message ?? null;

  useEffect(() => {
    saveResultsWorkbenchState({ timeRange, offset, selectedId });
  }, [timeRange, offset, selectedId]);

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !rows.some((r) => r.emailId === selectedId)) {
      setSelectedId(rows[0]!.emailId);
    }
  }, [rows, selectedId]);

  const selectedRow = rows.find((r) => r.emailId === selectedId) ?? null;
  const statusCounts = countByStatus(rows);

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.userQuery.all });
  }, [queryClient]);

  function handleRowUpdated(emailId: string, extracted: Record<string, unknown> | null, status: string) {
    queryClient.setQueryData<typeof resultsQuery.data>(queryKeys.userQuery.results(resultsParams), (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        extractedData: prev.extractedData.map((row) =>
          row.emailId === emailId ? { ...row, extracted, processingStatus: status } : row,
        ),
      };
    });
  }

  async function exportResults(format: "csv" | "json") {
    setExportError(null);
    setExporting(format);
    const { rows: exportRows, userQueryId, error: fetchError } = await fetchAllResultsForExport(timeRange);
    setExporting(null);
    if (fetchError) {
      setExportError(fetchError);
      return;
    }
    if (exportRows.length === 0) {
      setExportError("No records to export for this time range.");
      return;
    }

    if (format === "json") {
      const payload = buildExportJson(exportRows, { timeRange, userQueryId });
      downloadTextFile(
        JSON.stringify(payload, null, 2),
        exportFilename("json", timeRange),
        "application/json;charset=utf-8",
      );
      return;
    }

    const csv = buildExportCsv(exportRows, schema);
    downloadTextFile(csv, exportFilename("csv", timeRange), "text/csv;charset=utf-8");
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label">Human review</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-slate-950">Extraction results</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Select an email to review the original message, attachments, and extracted fields. Correct any
            mistakes before exporting to your systems.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={refresh} disabled={resultsQuery.isFetching}>
            {resultsQuery.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
          <Button
            variant="secondary"
            disabled={initialLoad || exporting !== null || total === 0}
            onClick={() => void exportResults("csv")}
          >
            {exporting === "csv" ? "Exporting…" : "Export CSV"}
          </Button>
          <Button
            variant="secondary"
            disabled={initialLoad || exporting !== null || total === 0}
            onClick={() => void exportResults("json")}
          >
            {exporting === "json" ? "Exporting…" : "Export JSON"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-slate-700">Period</span>
          <select
            className="input-field w-auto min-w-[140px]"
            value={timeRange}
            onChange={(e) => {
              setOffset(0);
              setTimeRange(e.target.value);
            }}
          >
            {TIME_RANGES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <div className="h-6 w-px bg-slate-200" />
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-800">
            {total} total
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-800">
            {completedCount} extracted
          </span>
          {statusCounts.skipped ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
              {statusCounts.skipped} skipped
            </span>
          ) : null}
          {statusCounts.pending || statusCounts.processing ? (
            <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-800">
              {(statusCounts.pending ?? 0) + (statusCounts.processing ?? 0)} in progress
            </span>
          ) : null}
        </div>
        {isRefreshing ? (
          <p className="w-full text-xs text-slate-400">Updating in background…</p>
        ) : null}
        <p className="w-full text-xs text-slate-500">
          Export includes all {total} record{total === 1 ? "" : "s"} in the selected period (not just this page).
        </p>
        {exportError ? <p className="w-full text-sm text-rose-600">{exportError}</p> : null}
      </div>

      {initialLoad ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-24">
          <p className="text-slate-500">Loading results…</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-8">
          <p className="font-medium text-rose-800">{error}</p>
          <p className="mt-1 text-sm text-rose-700">Create an active extraction query in Setup first.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-24">
          <p className="font-medium text-slate-800">No results yet</p>
          <p className="mt-1 text-sm text-slate-500">Run extraction from the pipeline to populate this queue.</p>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] lg:grid-cols-[minmax(280px,340px)_1fr]">
          <aside className="flex flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inbox queue</p>
            </div>
            <ul className="max-h-[520px] flex-1 divide-y divide-slate-100 overflow-y-auto lg:max-h-none">
              {rows.map((row) => {
                const active = row.emailId === selectedId;
                const hasExtract = row.extracted && Object.values(row.extracted).some((v) => v != null && v !== "");
                return (
                  <li key={row.emailId}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.emailId)}
                      className={`w-full px-4 py-3.5 text-left transition-colors ${
                        active
                          ? "border-l-[3px] border-l-blue-600 bg-blue-50/80"
                          : "border-l-[3px] border-l-transparent hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-semibold text-slate-950">
                          {row.subject ?? "(No subject)"}
                        </p>
                        <StatusBadge status={row.processingStatus} />
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">{row.sender ?? "Unknown sender"}</p>
                      {hasExtract ? (
                        <p className="mt-2 truncate text-xs text-emerald-700">
                          {Object.entries(row.extracted!)
                            .filter(([, v]) => v != null && v !== "")
                            .slice(0, 2)
                            .map(([k, v]) => `${k}: ${String(v)}`)
                            .join(" · ")}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-slate-400">No extracted fields</p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            {total > limit ? (
              <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  Prev
                </Button>
                <span className="text-xs text-slate-500">
                  {offset + 1}–{Math.min(offset + limit, total)} of {total}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={offset + limit >= total}
                  onClick={() => setOffset(offset + limit)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </aside>

          <section className="min-h-[480px] overflow-hidden">
            {selectedRow ? (
              <EmailReviewPanel row={selectedRow} schema={schema} onUpdated={handleRowUpdated} />
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-slate-500">
                Select an email to review
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
