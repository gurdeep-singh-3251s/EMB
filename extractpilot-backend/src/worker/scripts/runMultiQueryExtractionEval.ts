/**
 * Multi user-query extraction test — real dummy PDF/DOCX attachments, extraction metrics only.
 *
 *   bun docs/test-data/select-extraction-sample.ts 12
 *   bun --env-file=.env apps/worker/src/scripts/runMultiQueryExtractionEval.ts
 *
 * Options:
 *   --manifest path   (default: docs/test-data/extraction-sample-manifest.json)
 *   --limit N
 *   --concurrency N   (default 2)
 */
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadEnv } from "@repo/config";
import { createExtractionServices } from "@repo/feature-extraction";
import type { UserQueryRow } from "@repo/types/userQuery";
import type { WorkerAttachmentRow } from "@repo/types/workerProcessing";
import {
  writeDummyAttachment,
  type DummyAttachmentSpec,
} from "../../../../docs/test-data/fixtures/dummyAttachmentBuilder";

const REPO_ROOT = join(import.meta.dir, "../../../..");
const TEST_DATA_ROOT = join(REPO_ROOT, "docs/test-data");
const FIXTURE_ROOT = join(TEST_DATA_ROOT, ".dummy-attachments");

type FieldResult = { field: string; expected: unknown; actual: unknown; correct: boolean };

type Row = {
  testCaseId: string;
  userQueryId: string;
  userQueryPreview: string;
  category: string;
  subject: string;
  body: string;
  attachmentCount: number;
  extractedBody: Record<string, unknown> | null;
  expectedBody: Record<string, unknown>;
  bodyFieldResults: FieldResult[];
  bodyFieldsCorrect: boolean;
  error: string | null;
  ocrChars: number;
};

function parseArgs() {
  const args = process.argv.slice(2);
  let manifest = join(TEST_DATA_ROOT, "extraction-sample-manifest.json");
  let limit = Infinity;
  let concurrency = 2;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--manifest" && args[i + 1]) manifest = args[++i]!;
    if (args[i] === "--limit" && args[i + 1]) limit = Number(args[++i]);
    if (args[i] === "--concurrency" && args[i + 1]) concurrency = Number(args[++i]);
  }
  const manifestPath = manifest.startsWith("/") || /^[A-Za-z]:/.test(manifest)
    ? manifest
    : join(REPO_ROOT, manifest);
  return { manifestPath, limit, concurrency };
}

function norm(v: unknown): unknown {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "string") return v.trim().replace(/\s+/g, " ");
  if (typeof v === "number" || typeof v === "boolean") return v;
  return String(v);
}

function fieldMatch(expected: unknown, actual: unknown): boolean {
  const e = norm(expected);
  const a = norm(actual);
  if (e === null && a === null) return true;
  if (e === null || a === null) return false;
  if (typeof e === "number" || typeof a === "number") {
    const en = Number(e);
    const an = Number(a);
    if (Number.isFinite(en) && Number.isFinite(an)) return en === an;
  }
  return String(e).toLowerCase() === String(a).toLowerCase();
}

function compareBody(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
): { ok: boolean; results: FieldResult[] } {
  const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  const results: FieldResult[] = [];
  let ok = true;
  for (const field of keys) {
    const correct = fieldMatch(expected[field], actual[field]);
    if (!correct) ok = false;
    results.push({
      field,
      expected: expected[field] ?? null,
      actual: actual[field] ?? null,
      correct,
    });
  }
  return { ok, results };
}

function toUserQueryRow(
  id: string,
  userQuery: string,
  bodyFields: Record<string, { type: string; nullable?: boolean }>,
): UserQueryRow {
  return {
    id,
    userQuery,
    outputSchema: bodyFields,
    status: "active",
    createdAt: new Date(),
  };
}

async function runPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function evaluateExtraction(
  services: ReturnType<typeof createExtractionServices>,
  job: {
    caseId: string;
    userQuery: UserQueryRow;
    userQueryPreview: string;
    category: string;
    subject: string;
    body: string;
    attachments: DummyAttachmentSpec[];
    expectedBody: Record<string, unknown>;
  },
): Promise<Row> {
  const row: Row = {
    testCaseId: job.caseId,
    userQueryId: job.userQuery.id,
    userQueryPreview: job.userQueryPreview,
    category: job.category,
    subject: job.subject,
    body: job.body,
    attachmentCount: job.attachments.length,
    extractedBody: null,
    expectedBody: job.expectedBody,
    bodyFieldResults: [],
    bodyFieldsCorrect: false,
    error: null,
    ocrChars: 0,
  };

  try {
    const caseDir = join(FIXTURE_ROOT, job.caseId);
    const attachRows: WorkerAttachmentRow[] = [];
    for (let i = 0; i < job.attachments.length; i++) {
      const spec = job.attachments[i]!;
      const localPath = await writeDummyAttachment(caseDir, spec);
      attachRows.push({
        id: `dummy-${i}`,
        filename: spec.filename,
        mimeType: spec.mimeType,
        sizeBytes: 1000,
        localPath,
        extractedText: null,
        extractSource: null,
      });
    }

    const classifyInput = {
      userQuery: job.userQuery,
      subject: job.subject,
      sender: "dummy.test@eval.local",
      rawContent: job.body,
      attachments: attachRows.map((a) => ({ filename: a.filename, mimeType: a.mimeType })),
    };

    let extracted: Record<string, unknown> = {};

    if (attachRows.length === 0) {
      const r = await services.classifyAndExtract.classifyAndExtract(classifyInput);
      if (r.parsed?.email) extracted = r.parsed.email as Record<string, unknown>;
    } else {
      const classification = await services.classify.classify(classifyInput);
      if (!classification.relevant) {
        row.error = "Classifier marked not relevant (extraction test expected relevant)";
        return row;
      }
      const parsed = await services.documentParse.parseAttachments(attachRows);
      row.ocrChars = parsed.reduce((n, p) => n + (p.extractedText?.length ?? 0), 0);

      const final = await services.finalExtract.extract({
        userQuery: job.userQuery,
        subject: job.subject,
        sender: "dummy.test@eval.local",
        rawContent: job.body,
        attachmentRows: parsed,
      });
      extracted = final.email as Record<string, unknown>;
    }

    row.extractedBody = extracted;
    const cmp = compareBody(job.expectedBody, extracted);
    row.bodyFieldResults = cmp.results;
    row.bodyFieldsCorrect = cmp.ok;
  } catch (e) {
    row.error = e instanceof Error ? e.message : String(e);
  }

  return row;
}

function buildSimpleReport(rows: Row[], config: Record<string, unknown>): string {
  const ok = rows.filter((r) => r.bodyFieldsCorrect && !r.error).length;
  const errors = rows.filter((r) => r.error).length;
  const wrong = rows.length - ok - errors;

  let md = `# Multi-query extraction test (simple)\n\n`;
  md += `**What this is:** One dummy email per **user query profile**, with **real PDF/DOCX files** containing the same text every run. `;
  md += `We only score **body field extraction** (not classification).\n\n`;
  md += `\`\`\`json\n${JSON.stringify(config, null, 2)}\n\`\`\`\n\n`;
  md += `## Score\n\n`;
  md += `- **${ok} / ${rows.length}** emails: all body fields matched expected values.\n`;
  md += `- **${wrong}** emails: wrong or missing fields.\n`;
  md += `- **${errors}** emails: pipeline error (API, JSON, parse).\n\n`;

  md += `## Per user query\n\n`;
  md += `| User query | Case | Body fields OK? | OCR chars | Note |\n`;
  md += `|------------|------|-----------------|----------:|------|\n`;
  for (const r of rows) {
    const status = r.error ? `Error: ${r.error.slice(0, 40)}` : r.bodyFieldsCorrect ? "Yes" : "No";
    md += `| ${r.userQueryId} | ${r.testCaseId} | ${status} | ${r.ocrChars} | ${r.category} |\n`;
  }
  md += `\n`;

  md += `## Worst 10 (fix these first)\n\n`;
  const bad = rows.filter((r) => !r.bodyFieldsCorrect || r.error).slice(0, 10);
  for (const r of bad) {
    md += `### ${r.testCaseId} — ${r.userQueryId}\n\n`;
    md += `Query: ${r.userQueryPreview}\n\n`;
    if (r.error) {
      md += `**Error:** ${r.error}\n\n`;
      continue;
    }
    const wrongFields = r.bodyFieldResults.filter((f) => !f.correct);
    md += `| Field | Expected | Got |\n|-------|----------|-----|\n`;
    for (const f of wrongFields) {
      md += `| ${f.field} | ${JSON.stringify(f.expected)} | ${JSON.stringify(f.actual)} |\n`;
    }
    md += `\n`;
  }

  md += `## Tips\n\n`;
  md += `- Golden values are exact strings — use **enum** in schema or fuzzy match if the model uses different words.\n`;
  md += `- Attachment-specific fields are **not scored** yet (worker only fills email body schema).\n`;
  md += `- Re-run: \`bun run eval:extraction-sample\` (12 profiles) or \`bun run eval:extraction-all\` (all profiles).\n`;
  md += `- Full app test: \`bun run seed:dummy-emails\` then watch \`dev:worker\`.\n`;

  return md;
}

async function main() {
  const { manifestPath, limit, concurrency } = parseArgs();
  const env = loadEnv();
  if (!env.openRouter.apiKey) {
    console.error("OPENROUTER_API_KEY required in .env");
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as {
    cases: Array<{ dataset: string; id: string; userQueryId: string }>;
  };

  const v2 = JSON.parse(readFileSync(join(TEST_DATA_ROOT, "multi-query-extraction-test-cases.json"), "utf-8")) as {
    userQueries: Array<{
      id: string;
      userQuery: string;
      outputSchema: { email: { body: Record<string, { type: string }> }; attachment: Record<string, unknown> };
    }>;
    testCases: Array<{
      id: string;
      userQueryId: string;
      category: string;
      emailSubject: string;
      emailBody: string;
      attachments: DummyAttachmentSpec[];
      expectedExtracted: { email: { body: Record<string, unknown> } };
    }>;
  };

  const profileMap = new Map(v2.userQueries.map((p) => [p.id, p]));
  const caseMap = new Map(v2.testCases.map((c) => [c.id, c]));

  const services = createExtractionServices({
    openRouter: env.openRouter,
    classifyModel: env.openRouter.classifyModel,
    extractModel: env.openRouter.extractModel,
    pipelineDebug: false,
    paddle: {
      attachmentsRoot: env.attachmentsRoot,
      apiMode: env.paddleOcr.apiMode,
      apiUrl: env.paddleOcr.apiUrl,
      apiToken: env.paddleOcr.apiToken,
      timeoutMs: env.paddleOcr.timeoutMs,
      pdfTextMinChars: env.paddleOcr.pdfTextMinChars,
      model: env.paddleOcr.model,
      pollIntervalMs: env.paddleOcr.pollIntervalMs,
      jobTimeoutMs: env.paddleOcr.jobTimeoutMs,
    },
  });

  const jobs = [];
  for (const m of manifest.cases.slice(0, limit)) {
    const tc = caseMap.get(m.id);
    const p = profileMap.get(m.userQueryId);
    if (!tc || !p) continue;
    jobs.push({
      caseId: tc.id,
      userQuery: toUserQueryRow(p.id, p.userQuery, p.outputSchema.email.body),
      userQueryPreview: p.userQuery.slice(0, 100),
      category: tc.category,
      subject: tc.emailSubject,
      body: tc.emailBody,
      attachments: tc.attachments ?? [],
      expectedBody: tc.expectedExtracted.email.body,
    });
  }

  console.log(`Multi-query extraction eval: ${jobs.length} emails, concurrency=${concurrency}`);
  await mkdir(FIXTURE_ROOT, { recursive: true });

  const rows = await runPool(jobs, concurrency, (job) => evaluateExtraction(services, job));

  const config = { manifestPath, casesRun: jobs.length, concurrency, focus: "body_extraction_only" };
  const report = { generatedAt: new Date().toISOString(), config, rows };
  const outJson = join(TEST_DATA_ROOT, "multi-query-extraction-report.json");
  const outMd = join(TEST_DATA_ROOT, "MULTI-QUERY-EXTRACTION-SIMPLE.md");
  await writeFile(outJson, JSON.stringify(report, null, 2));
  await writeFile(outMd, buildSimpleReport(rows, config));

  const ok = rows.filter((r) => r.bodyFieldsCorrect && !r.error).length;
  console.log(`Body extraction pass: ${ok}/${rows.length}`);
  console.log(`Wrote ${outJson} and ${outMd}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
