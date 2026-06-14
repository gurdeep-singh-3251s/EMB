import { restClient, type ExtractedRow, type FieldSpec } from "@/lib/restClient";

const PAGE_SIZE = 100;

export type ExportPayload = {
  exportedAt: string;
  timeRange: string;
  userQueryId: string | null;
  recordCount: number;
  records: Array<{
    emailId: string;
    subject: string | null;
    sender: string | null;
    processingStatus: string;
    extracted: Record<string, unknown> | null;
    attachmentCount: number;
    attachmentNames: string;
  }>;
};

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function collectFieldKeys(rows: ExtractedRow[], schema: Record<string, FieldSpec>): string[] {
  const keys = new Set<string>(Object.keys(schema));
  for (const row of rows) {
    if (!row.extracted) continue;
    for (const key of Object.keys(row.extracted)) {
      keys.add(key);
    }
  }
  const schemaOrder = Object.keys(schema);
  const ordered = schemaOrder.filter((k) => keys.has(k));
  const rest = [...keys].filter((k) => !schemaOrder.includes(k)).sort();
  return [...ordered, ...rest];
}

export async function fetchAllResultsForExport(
  timeRange: string,
): Promise<{ rows: ExtractedRow[]; userQueryId: string | null; error?: string }> {
  const all: ExtractedRow[] = [];
  let offset = 0;
  let userQueryId: string | null = null;
  let total = 0;

  while (true) {
    const res = await restClient.userQuery.results({
      limit: PAGE_SIZE,
      offset,
      timeRange,
      includeInProgress: true,
    });
    if (!res.success) {
      return { rows: [], userQueryId: null, error: res.message };
    }
    userQueryId = res.data.userQueryId;
    total = res.data.total;
    all.push(...res.data.extractedData);
    offset += res.data.extractedData.length;
    if (offset >= total || res.data.extractedData.length === 0) break;
  }

  return { rows: all, userQueryId };
}

export function buildExportJson(
  rows: ExtractedRow[],
  meta: { timeRange: string; userQueryId: string | null },
): ExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    timeRange: meta.timeRange,
    userQueryId: meta.userQueryId,
    recordCount: rows.length,
    records: rows.map((row) => ({
      emailId: row.emailId,
      subject: row.subject,
      sender: row.sender,
      processingStatus: row.processingStatus,
      extracted: row.extracted,
      attachmentCount: row.source?.attachments?.length ?? 0,
      attachmentNames: (row.source?.attachments ?? []).map((a) => a.filename).join("; "),
    })),
  };
}

export function buildExportCsv(rows: ExtractedRow[], schema: Record<string, FieldSpec>): string {
  const fieldKeys = collectFieldKeys(rows, schema);
  const metaHeaders = ["email_id", "subject", "sender", "processing_status", "attachment_count"];
  const headers = [...metaHeaders, ...fieldKeys];

  const lines = [headers.join(",")];

  for (const row of rows) {
    const attachments = row.source?.attachments ?? [];
    const metaCells = [
      row.emailId,
      row.subject ?? "",
      row.sender ?? "",
      row.processingStatus,
      String(attachments.length),
    ];
    const fieldCells = fieldKeys.map((key) => cellToString(row.extracted?.[key]));
    lines.push([...metaCells, ...fieldCells].map((c) => csvEscape(c)).join(","));
  }

  return lines.join("\r\n");
}

export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportFilename(ext: "csv" | "json", timeRange: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const range = timeRange.replace(/[^a-z0-9]+/gi, "-");
  return `extractpilot-results-${range}-${date}.${ext}`;
}
