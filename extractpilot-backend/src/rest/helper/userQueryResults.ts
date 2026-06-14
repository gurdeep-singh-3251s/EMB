import type { UserQueryEmailResult } from "@repo/types/userQuery";
import type { ParsedEmailResult } from "@repo/types/parsedEmail";
import type { RestAppContext } from "@repo/types/restTypes";
import {
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_POLL_LIMIT,
  DEFAULT_POLL_TIMEOUT_MS,
  type ExtractedDataRow,
  type RestExtractedSource,
  type UserQueryResultsPayload,
  type PollOptions,
} from "@repo/types/restTypes";

function buildSource(row: UserQueryEmailResult): RestExtractedSource {
  const parsed = row.parsedJson as ParsedEmailResult | null;
  const attachments = (parsed?.attachments ?? []).map((att) => ({
    filename: att.filename,
    mimeType: att.mimeType,
    status: String(att.status),
  }));
  return {
    rawContent: row.rawContent,
    attachments,
  };
}

function resolvePollTimeoutMs(options: PollOptions): number {
  if (options.timeoutMs !== undefined) {
    return options.timeoutMs;
  }
  return DEFAULT_POLL_TIMEOUT_MS;
}

function resolvePollIntervalMs(options: PollOptions): number {
  if (options.intervalMs !== undefined) {
    return options.intervalMs;
  }
  return DEFAULT_POLL_INTERVAL_MS;
}

function resolvePollLimit(options: PollOptions): number {
  if (options.limit !== undefined) {
    return options.limit;
  }
  return DEFAULT_POLL_LIMIT;
}

const IN_FLIGHT_STATUSES = new Set(["pending", "processing"]);

function isTerminalProcessingStatus(status: string): boolean {
  return !IN_FLIGHT_STATUSES.has(status);
}

function buildUserQueryResultsPayload(rows: UserQueryEmailResult[]): UserQueryResultsPayload {
  const extractedData: ExtractedDataRow[] = rows.map((row) => ({
    emailId: row.id,
    subject: row.subject,
    sender: row.sender,
    processingStatus: row.processingStatus,
    extracted: row.extracted,
    classification: row.classificationResult,
    source: buildSource(row),
  }));

  const completedCount = extractedData.filter(
    (row) => row.processingStatus === "completed" || row.processingStatus === "partial",
  ).length;

  const processedCount = extractedData.filter((row) =>
    isTerminalProcessingStatus(row.processingStatus),
  ).length;

  return {
    count: rows.length,
    completedCount,
    processedCount,
    extractedData,
    results: rows,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollUserQueryResults(
  ctx: RestAppContext,
  userQueryId: string,
  options: PollOptions = { timeoutMs: undefined, intervalMs: undefined, limit: undefined },
): Promise<{ rows: UserQueryEmailResult[]; total: number; timedOut: boolean }> {
  const timeoutMs = resolvePollTimeoutMs(options);
  const intervalMs = resolvePollIntervalMs(options);
  const limit = resolvePollLimit(options);
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const batch = await ctx.services.userQuery.listResults(userQueryId, {
      limit,
      offset: 0,
      includeInProgress: true,
    });
    if (!batch.success) {
      return { rows: [], total: 0, timedOut: false };
    }

    const rows = batch.data.items;
    const total = batch.data.total;
    const inFlight = rows.filter((row) => !isTerminalProcessingStatus(row.processingStatus));

    if (total > 0 && inFlight.length === 0 && rows.length >= total) {
      return { rows, total, timedOut: false };
    }

    await sleep(intervalMs);
  }

  const final = await ctx.services.userQuery.listResults(userQueryId, {
    limit,
    offset: 0,
    includeInProgress: true,
  });
  if (!final.success) {
    return { rows: [], total: 0, timedOut: true };
  }

  const rows = final.data.items;
  const inFlight = rows.filter((row) => !isTerminalProcessingStatus(row.processingStatus));
  const sawAllRows = final.data.total > 0 && rows.length >= final.data.total;
  return {
    rows,
    total: final.data.total,
    timedOut: inFlight.length > 0 || !sawAllRows,
  };
}

export {
  buildUserQueryResultsPayload,
  isTerminalProcessingStatus,
  pollUserQueryResults,
};
