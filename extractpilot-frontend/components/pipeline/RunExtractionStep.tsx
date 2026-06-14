"use client";

import { useEffect, useRef, useState } from "react";
import { restClient, type LookbackOption } from "@/lib/restClient";
import { useExtractionRun } from "@/contexts/ExtractionRunContext";
import { useInvalidateDashboardData } from "@/hooks/useUserQueryQueries";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";

const POLL_MS = 2000;

type RunStatus = "idle" | "fetching" | "processing" | "complete";

type RunResult = {
  imapFetched: number;
  enqueued: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function statusMessage(status: RunStatus): string {
  switch (status) {
    case "fetching":
      return "Fetching emails from your mailbox…";
    case "processing":
      return "Running AI extraction on queued emails…";
    case "complete":
      return "Extraction finished.";
    default:
      return "";
  }
}

export function RunExtractionStep() {
  const { setIsRunning, registerLeaveHandler } = useExtractionRun();
  const invalidate = useInvalidateDashboardData();
  const [options, setOptions] = useState<LookbackOption[]>([]);
  const [lookback, setLookback] = useState("1day");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    void restClient.mailbox.lookbackOptions().then((res) => {
      if (res.success) {
        setOptions(res.data.options);
        const defaultKey = res.data.options.find((o) => o.key === "1day")?.key ?? res.data.options[0]?.key;
        if (defaultKey) setLookback(defaultKey);
      }
    });
  }, []);

  useEffect(() => {
    return registerLeaveHandler(() => {
      abortRef.current?.abort();
    });
  }, [registerLeaveHandler]);

  async function waitForProcessing(runId: number, signal: AbortSignal): Promise<void> {
    while (!signal.aborted && runIdRef.current === runId) {
      const res = await restClient.userQuery.results({
        includeInProgress: true,
        limit: 1,
        timeRange: "all",
      });
      if (res.success) {
        const counts = res.data.statusCounts;
        const inFlight = (counts?.pending ?? 0) + (counts?.processing ?? 0);
        if (inFlight === 0) return;
      }
      await sleep(POLL_MS);
    }
  }

  async function run() {
    const runId = ++runIdRef.current;
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setIsRunning(true);
    setError(null);
    setResult(null);
    setStatus("fetching");

    const extractRes = await restClient.mailbox.extractEmails({
      lookback,
      unreadOnly,
      waitForResults: false,
    });

    if (runIdRef.current !== runId) return;

    if (!extractRes.success) {
      setIsRunning(false);
      setStatus("idle");
      setError(extractRes.message);
      return;
    }

    const summary = {
      imapFetched: extractRes.data.imapFetched,
      enqueued: extractRes.data.enqueued,
    };
    setResult(summary);

    if (extractRes.data.enqueued > 0) {
      setStatus("processing");
      await waitForProcessing(runId, abort.signal);
      if (abort.signal.aborted || runIdRef.current !== runId) return;
    }

    setStatus("complete");
    setIsRunning(false);
    invalidate.afterExtraction();
  }

  const running = status === "fetching" || status === "processing";

  return (
    <div className="space-y-4">
      <Panel title="Fetch settings">
        <div className="grid gap-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Lookback window</span>
            <select
              className="input-field mt-2"
              value={lookback}
              onChange={(e) => setLookback(e.target.value)}
              disabled={running}
            >
              {options.length === 0 ? (
                <option value={lookback}>{lookback}</option>
              ) : (
                options.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 transition-colors hover:border-slate-300">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              disabled={running}
            />
            <span className="text-sm font-medium">Unread only</span>
          </label>
        </div>
        {running ? (
          <p className="mt-4 text-sm font-medium text-amber-800">
            Please stay on this page until extraction completes.
          </p>
        ) : null}
        <Button variant="accent" className="mt-4" onClick={run} disabled={running}>
          {running ? "Running…" : "Extract emails"}
        </Button>
      </Panel>

      {running ? (
        <Panel title="Extraction in progress">
          <div className="flex items-start gap-4">
            <span className="mt-0.5 inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            <div>
              <p className="text-sm font-medium text-slate-900">{statusMessage(status)}</p>
              <p className="mt-1 text-sm text-slate-500">
                Navigation is locked while this run is active.
              </p>
            </div>
          </div>
        </Panel>
      ) : null}

      {result && status === "complete" ? (
        <Panel title="Run summary">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Fetched</p>
              <p className="metric-value mt-1 text-2xl">{result.imapFetched}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Enqueued</p>
              <p className="metric-value mt-1 text-2xl">{result.enqueued}</p>
            </div>
          </div>
          {result.enqueued === 0 && result.imapFetched > 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              All fetched emails were already processed for this query.
            </p>
          ) : null}
          <LinkButton href="/dashboard/results" variant="secondary" className="mt-4">
            View results
          </LinkButton>
        </Panel>
      ) : null}

      {error ? (
        <Panel title="Error">
          <p className="text-sm text-rose-600">{error}</p>
        </Panel>
      ) : null}
    </div>
  );
}
