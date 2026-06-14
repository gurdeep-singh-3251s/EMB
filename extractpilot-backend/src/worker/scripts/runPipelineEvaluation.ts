/**
 * AI pipeline evaluation — run from repo root:
 *   bun --env-file=.env apps/worker/src/scripts/runPipelineEvaluation.ts
 */
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadEnv } from "@repo/config";
import { createExtractionServices } from "@repo/feature-extraction";
import type { UserQueryRow } from "@repo/types/userQuery";
import type { WorkerAttachmentRow } from "@repo/types/workerProcessing";
import { writeDummyAttachment } from "../../../../docs/test-data/fixtures/dummyAttachmentBuilder";

const REPO_ROOT = join(import.meta.dir, "../../../..");
const TEST_DATA_ROOT = join(REPO_ROOT, "docs/test-data");
const EVAL_ATTACH_ROOT = join(TEST_DATA_ROOT, ".eval-attachments");

type Risk = string;

type EvalRow = {
  testCaseId: string;
  dataset: "v1" | "v2";
  userQueryId: string;
  category: string;
  riskLevel: Risk;
  input: {
    subject: string;
    body: string;
    attachments: Array<{ filename: string; mimeType: string }>;
  };
  ocrOutput: Array<{ filename: string; source: string | null; textLength: number; textPreview: string }> | null;
  classificationResult: {
    relevant: boolean;
    confidence?: number;
    reason?: string;
    likelyFields?: string[];
  } | null;
  classificationConfidence: number | null;
  extractedJson: Record<string, unknown> | null;
  expectedJson: Record<string, unknown>;
  classificationCorrect: boolean | null;
  extractionCorrect: boolean | null;
  fieldResults: Array<{ field: string; expected: unknown; actual: unknown; correct: boolean }>;
  error: string | null;
  failureCategory: string | null;
  severity: string | null;
  expectedRelevant: boolean;
};

function parseArgs() {
  const args = process.argv.slice(2);
  let dataset: "v1" | "v2" | "all" = "all";
  let limit = Infinity;
  let concurrency = 2;
  let offset = 0;
  let manifestPath: string | null = null;
  let outSuffix = "";
  let simpleReport = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dataset" && args[i + 1]) dataset = args[++i] as "v1" | "v2" | "all";
    if (args[i] === "--limit" && args[i + 1]) limit = Number(args[++i]);
    if (args[i] === "--offset" && args[i + 1]) offset = Number(args[++i]);
    if (args[i] === "--concurrency" && args[i + 1]) concurrency = Number(args[++i]);
    if (args[i] === "--manifest" && args[i + 1]) manifestPath = args[++i]!;
    if (args[i] === "--out-suffix" && args[i + 1]) outSuffix = args[++i]!;
    if (args[i] === "--simple") simpleReport = true;
  }
  return { dataset, limit, offset, concurrency, manifestPath, outSuffix, simpleReport };
}

function loadManifestKeys(manifestPath: string): Set<string> {
  const raw = JSON.parse(readFileSync(manifestPath, "utf-8")) as {
    cases: Array<{ dataset: string; id: string }>;
  };
  return new Set(raw.cases.map((c) => `${c.dataset}:${c.id}`));
}

function norm(v: unknown): unknown {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "string") return v.trim().replace(/\s+/g, " ");
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v;
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

function compareFields(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
): { allCorrect: boolean; results: EvalRow["fieldResults"] } {
  const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  const results: EvalRow["fieldResults"] = [];
  let allCorrect = true;
  for (const field of keys) {
    const correct = fieldMatch(expected[field], actual[field]);
    if (!correct) allCorrect = false;
    results.push({
      field,
      expected: expected[field] ?? null,
      actual: actual[field] ?? null,
      correct,
    });
  }
  return { allCorrect, results };
}

function toUserQueryRow(
  id: string,
  userQuery: string,
  outputSchema: Record<string, unknown>,
): UserQueryRow {
  return {
    id,
    userQuery,
    outputSchema,
    status: "active",
    createdAt: new Date(),
  };
}

async function writeFixture(
  caseId: string,
  att: { filename: string; mimeType: string; description?: string; condition?: string },
): Promise<string> {
  return writeDummyAttachment(join(EVAL_ATTACH_ROOT, caseId), att);
}

type V1Case = {
  id: string;
  category: string;
  emailSubject: string;
  emailBody: string;
  attachments?: Array<{ filename: string; mimeType: string; description?: string; condition?: string }>;
  expectedClassification: { relevant: boolean };
  expectedExtracted: Record<string, unknown>;
  riskLevel: Risk;
};

type V2Profile = {
  id: string;
  userQuery: string;
  outputSchema: {
    email: { body: Record<string, { type: string }> };
    attachment: Record<string, { type: string }>;
  };
};

type V2Case = {
  id: string;
  userQueryId: string;
  category: string;
  emailSubject: string;
  emailBody: string;
  attachments: Array<{ filename: string; mimeType: string; description?: string; condition?: string }>;
  expectedClassification: { relevant: boolean };
  expectedExtracted: {
    email: { body: Record<string, unknown> };
    attachments: Array<{ filename: string; fields: Record<string, unknown>; extractExpected?: boolean }>;
  };
  riskLevel: Risk;
};

async function evaluateOne(
  services: ReturnType<typeof createExtractionServices>,
  opts: {
    dataset: "v1" | "v2";
    caseId: string;
    category: string;
    riskLevel: Risk;
    userQuery: UserQueryRow;
    subject: string;
    body: string;
    attachmentSpecs: Array<{ filename: string; mimeType: string; description?: string; condition?: string }>;
    expectedRelevant: boolean;
    expectedFlat: Record<string, unknown>;
    expectedAttachFields?: Array<{ filename: string; fields: Record<string, unknown>; extractExpected: boolean }>;
  },
): Promise<EvalRow> {
  const row: EvalRow = {
    testCaseId: opts.caseId,
    dataset: opts.dataset,
    userQueryId: opts.userQuery.id,
    category: opts.category,
    riskLevel: opts.riskLevel,
    input: {
      subject: opts.subject,
      body: opts.body,
      attachments: opts.attachmentSpecs.map((a) => ({ filename: a.filename, mimeType: a.mimeType })),
    },
    ocrOutput: null,
    classificationResult: null,
    classificationConfidence: null,
    extractedJson: null,
    expectedJson: opts.expectedFlat,
    classificationCorrect: null,
    extractionCorrect: null,
    fieldResults: [],
    error: null,
    failureCategory: null,
    severity: null,
    expectedRelevant: opts.expectedRelevant,
  };

  try {
    const attachRows: WorkerAttachmentRow[] = [];
    for (let i = 0; i < opts.attachmentSpecs.length; i++) {
      const spec = opts.attachmentSpecs[i]!;
      const localPath = await writeFixture(opts.caseId, spec);
      attachRows.push({
        id: `eval-${i}`,
        filename: spec.filename,
        mimeType: spec.mimeType,
        sizeBytes: 100,
        localPath,
        extractedText: null,
        extractSource: null,
      });
    }

    const classifyInput = {
      userQuery: opts.userQuery,
      subject: opts.subject,
      sender: "eval@local.test",
      rawContent: opts.body,
      attachments: attachRows.map((a) => ({ filename: a.filename, mimeType: a.mimeType })),
    };

    let extracted: Record<string, unknown> = {};
    const hasAttachments = attachRows.length > 0;

    if (!hasAttachments) {
      const r = await services.classifyAndExtract.classifyAndExtract(classifyInput);
      row.classificationResult = r.classification;
      row.classificationConfidence = r.classification.confidence ?? null;
      if (r.parsed?.email) extracted = r.parsed.email as Record<string, unknown>;
    } else {
      const classification = await services.classify.classify(classifyInput);
      row.classificationResult = classification;
      row.classificationConfidence = classification.confidence ?? null;

      if (classification.relevant) {
        const parsed = await services.documentParse.parseAttachments(attachRows);
        row.ocrOutput = parsed.map((p) => ({
          filename: p.filename,
          source: p.extractSource,
          textLength: p.extractedText?.length ?? 0,
          textPreview: (p.extractedText ?? "").slice(0, 200),
        }));

        const final = await services.finalExtract.extract({
          userQuery: opts.userQuery,
          subject: opts.subject,
          sender: "eval@local.test",
          rawContent: opts.body,
          attachmentRows: parsed,
        });
        extracted = final.email as Record<string, unknown>;
      }
    }

    row.extractedJson = extracted;
    row.classificationCorrect = (row.classificationResult?.relevant ?? false) === opts.expectedRelevant;

    if (!opts.expectedRelevant) {
      const noLeak = Object.values(extracted).every((v) => v === null || v === undefined);
      row.extractionCorrect = noLeak && !row.classificationResult?.relevant;
      row.fieldResults = Object.keys(opts.expectedFlat).map((field) => ({
        field,
        expected: null,
        actual: extracted[field] ?? null,
        correct: (extracted[field] ?? null) === null,
      }));
    } else if (!row.classificationResult?.relevant) {
      row.extractionCorrect = false;
      row.failureCategory = "false_negative";
      row.severity = "high";
    } else {
      const cmp = compareFields(opts.expectedFlat, extracted);
      row.fieldResults = cmp.results;
      row.extractionCorrect = cmp.allCorrect;

      if (opts.expectedAttachFields?.length) {
        for (const exp of opts.expectedAttachFields) {
          if (!exp.extractExpected) continue;
          for (const [field, expVal] of Object.entries(exp.fields)) {
            if (expVal === null || expVal === undefined) continue;
            const actualVal = null;
            const correct = fieldMatch(expVal, actualVal);
            row.fieldResults.push({
              field: `attachment:${exp.filename}:${field}`,
              expected: expVal,
              actual: actualVal,
              correct,
            });
            if (!correct) row.extractionCorrect = false;
          }
        }
      }
    }

    if (!row.classificationCorrect && opts.expectedRelevant) {
      row.failureCategory = "false_negative";
      row.severity = "high";
    } else if (!row.classificationCorrect && !opts.expectedRelevant) {
      row.failureCategory = "false_positive";
      row.severity = "medium";
    } else if (row.classificationCorrect && opts.expectedRelevant && !row.extractionCorrect) {
      row.failureCategory = row.ocrOutput?.some((o) => o.textLength === 0)
        ? "ocr_or_parse_empty"
        : "extraction_field_mismatch";
      row.severity = row.riskLevel === "critical" ? "critical" : "medium";
    } else if (row.classificationCorrect && !opts.expectedRelevant && !row.extractionCorrect) {
      row.failureCategory = "false_positive_extraction_leak";
      row.severity = "medium";
    }
  } catch (e) {
    row.error = e instanceof Error ? e.message : String(e);
    row.classificationCorrect = false;
    row.extractionCorrect = false;
    row.failureCategory = "pipeline_error";
    row.severity = "critical";
  }

  return row;
}

async function runPool<T, R>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function main() {
  const { dataset, limit, offset, concurrency, manifestPath, outSuffix, simpleReport } = parseArgs();
  const manifestKeys = manifestPath
    ? loadManifestKeys(manifestPath.startsWith("/") ? manifestPath : join(REPO_ROOT, manifestPath))
    : null;
  const env = loadEnv();
  if (!env.openRouter.apiKey) {
    console.error("OPENROUTER_API_KEY required");
    process.exit(1);
  }

  await mkdir(EVAL_ATTACH_ROOT, { recursive: true });

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

  type Job = Parameters<typeof evaluateOne>[1];
  const jobs: Job[] = [];

  if (dataset === "v1" || dataset === "all") {
    const v1 = JSON.parse(readFileSync(join(TEST_DATA_ROOT, "extraction-test-cases.json"), "utf-8")) as {
      meta: { baseline: { userQuery: string; outputSchema: Record<string, unknown> } };
      testCases: V1Case[];
    };
    const uq = toUserQueryRow("eval-v1", v1.meta.baseline.userQuery, v1.meta.baseline.outputSchema);
    for (const tc of v1.testCases) {
      jobs.push({
        dataset: "v1",
        caseId: tc.id,
        category: tc.category,
        riskLevel: tc.riskLevel,
        userQuery: uq,
        subject: tc.emailSubject,
        body: tc.emailBody,
        attachmentSpecs: tc.attachments ?? [],
        expectedRelevant: tc.expectedClassification.relevant,
        expectedFlat: tc.expectedExtracted,
      });
    }
  }

  if (dataset === "v2" || dataset === "all") {
    const v2 = JSON.parse(readFileSync(join(TEST_DATA_ROOT, "multi-query-extraction-test-cases.json"), "utf-8")) as {
      userQueries: V2Profile[];
      testCases: V2Case[];
    };
    const profileMap = new Map(v2.userQueries.map((p) => [p.id, p]));
    for (const tc of v2.testCases) {
      const p = profileMap.get(tc.userQueryId);
      if (!p) continue;
      const uq = toUserQueryRow(p.id, p.userQuery, p.outputSchema.email.body);
      jobs.push({
        dataset: "v2",
        caseId: tc.id,
        category: tc.category,
        riskLevel: tc.riskLevel,
        userQuery: uq,
        subject: tc.emailSubject,
        body: tc.emailBody,
        attachmentSpecs: tc.attachments ?? [],
        expectedRelevant: tc.expectedClassification.relevant,
        expectedFlat: tc.expectedExtracted.email.body,
        expectedAttachFields: tc.expectedExtracted.attachments.map((a) => ({
          filename: a.filename,
          fields: a.fields,
          extractExpected: a.extractExpected !== false,
        })),
      });
    }
  }

  let filtered = jobs;
  if (manifestKeys) {
    filtered = jobs.filter((j) => manifestKeys.has(`${j.dataset}:${j.caseId}`));
    console.log(`Manifest filter: ${filtered.length} cases`);
  }
  const slice = filtered.slice(offset, offset + limit);
  console.log(`Evaluating ${slice.length} cases (concurrency=${concurrency})…`);

  const results = await runPool(slice, concurrency, async (job, i) => {
    if (i > 0 && i % 25 === 0) console.log(`  progress ${i}/${slice.length}`);
    return evaluateOne(services, job);
  });

  let TP = 0,
    FP = 0,
    TN = 0,
    FN = 0;
  let fieldCorrect = 0,
    fieldTotal = 0;

  for (const r of results) {
    const exp = r.expectedRelevant;
    const act = r.classificationResult?.relevant ?? false;
    if (exp && act) TP++;
    else if (!exp && act) FP++;
    else if (!exp && !act) TN++;
    else if (exp && !act) FN++;

    for (const fr of r.fieldResults) {
      fieldTotal++;
      if (fr.correct) fieldCorrect++;
    }
  }

  const extractDenomAll = results.length;
  const extractPassAll = results.filter((x) => x.extractionCorrect).length;
  const relevantRows = results.filter((x) => x.expectedRelevant);
  const extractDenom = relevantRows.length;
  const extractPass = relevantRows.filter((x) => x.extractionCorrect).length;

  const classAcc = (TP + TN) / results.length;
  const fpr = FP / (FP + TN || 1);
  const fnr = FN / (FN + TP || 1);

  const failures = results
    .filter((r) => !r.classificationCorrect || !r.extractionCorrect || r.error)
    .map((r) => ({
      testCaseId: r.testCaseId,
      dataset: r.dataset,
      category: r.category,
      input: r.input,
      expectedOutput: r.expectedJson,
      actualOutput: r.extractedJson,
      classification: r.classificationResult,
      confidence: r.classificationConfidence,
      ocrOutput: r.ocrOutput,
      failureCategory: r.failureCategory ?? (r.error ? "pipeline_error" : "unknown"),
      severity: r.severity ?? r.riskLevel,
      fieldResults: r.fieldResults.filter((f) => !f.correct),
      error: r.error,
      classificationCorrect: r.classificationCorrect,
      extractionCorrect: r.extractionCorrect,
    }))
    .sort((a, b) => {
      const sev = (s: string) => (s === "critical" ? 0 : s === "high" ? 1 : s === "medium" ? 2 : 3);
      return sev(String(a.severity)) - sev(String(b.severity));
    });

  const report = {
    generatedAt: new Date().toISOString(),
    config: {
      dataset,
      limit: Number.isFinite(limit) ? limit : "all",
      offset,
      concurrency,
      casesRun: slice.length,
      manifest: manifestPath ?? null,
      outSuffix: outSuffix || null,
    },
    metrics: {
      classificationAccuracy: classAcc,
      falsePositiveRate: fpr,
      falseNegativeRate: fnr,
      confusionMatrix: { TP, FP, TN, FN },
      fieldLevelAccuracy: fieldTotal ? fieldCorrect / fieldTotal : 0,
      fieldCorrect,
      fieldTotal,
      overallExtractionAccuracy: extractDenomAll ? extractPassAll / extractDenomAll : 0,
      overallExtractionAccuracyRelevantOnly: extractDenom ? extractPass / extractDenom : 0,
      extractPass,
      extractDenom,
      extractPassAll,
      extractDenomAll,
      pipelineErrors: results.filter((r) => r.error).length,
    },
    top50Failures: failures.slice(0, 50),
    allResults: results,
  };

  const suffix = outSuffix ? `-${outSuffix}` : "";
  const outJson = join(TEST_DATA_ROOT, `evaluation-report${suffix}.json`);
  const outMd = join(TEST_DATA_ROOT, `EVALUATION-REPORT${suffix.toUpperCase()}.md`);
  await writeFile(outJson, JSON.stringify(report, null, 2));
  await writeFile(outMd, buildMarkdown(report));
  if (simpleReport) {
    const simplePath = join(TEST_DATA_ROOT, `EVALUATION-SIMPLE${suffix.toUpperCase()}.md`);
    await writeFile(simplePath, buildSimpleMarkdown(report, slice.length));
    console.log(`Wrote ${simplePath}`);
  }
  console.log(`\nMetrics:`);
  console.log(`  Classification accuracy: ${(classAcc * 100).toFixed(2)}%`);
  console.log(`  False positive rate: ${(fpr * 100).toFixed(2)}%`);
  console.log(`  False negative rate: ${(fnr * 100).toFixed(2)}%`);
  console.log(`  Field-level accuracy: ${((fieldTotal ? fieldCorrect / fieldTotal : 0) * 100).toFixed(2)}%`);
  console.log(`  Overall extraction accuracy: ${((extractDenomAll ? extractPassAll / extractDenomAll : 0) * 100).toFixed(2)}%`);
  console.log(`  Failures: ${failures.length} / ${results.length}`);
  console.log(`Wrote ${outJson} and ${outMd}`);
}

function buildMarkdown(report: {
  generatedAt: string;
  config: Record<string, unknown>;
  metrics: Record<string, unknown>;
  top50Failures: Array<Record<string, unknown>>;
}): string {
  const m = report.metrics as {
    classificationAccuracy: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
    confusionMatrix: { TP: number; FP: number; TN: number; FN: number };
    fieldLevelAccuracy: number;
    overallExtractionAccuracy: number;
    overallExtractionAccuracyRelevantOnly: number;
    pipelineErrors: number;
  };
  let md = `# AI Pipeline Evaluation Report\n\n`;
  md += `Generated: ${report.generatedAt}\n\n`;
  md += `## Configuration\n\n\`\`\`json\n${JSON.stringify(report.config, null, 2)}\n\`\`\`\n\n`;
  md += `## Aggregate Metrics\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Classification accuracy | ${(m.classificationAccuracy * 100).toFixed(2)}% |\n`;
  md += `| False positive rate | ${(m.falsePositiveRate * 100).toFixed(2)}% |\n`;
  md += `| False negative rate | ${(m.falseNegativeRate * 100).toFixed(2)}% |\n`;
  md += `| Field-level accuracy | ${(m.fieldLevelAccuracy * 100).toFixed(2)}% |\n`;
  md += `| Overall extraction accuracy (all cases) | ${(m.overallExtractionAccuracy * 100).toFixed(2)}% |\n`;
  md += `| Extraction accuracy (expected relevant only) | ${(m.overallExtractionAccuracyRelevantOnly * 100).toFixed(2)}% |\n`;
  md += `| Pipeline errors | ${m.pipelineErrors} |\n\n`;
  md += `### Confusion matrix (relevance)\n\n`;
  md += `| | Predicted relevant | Predicted not relevant |\n`;
  md += `|--|:---:|:---:|\n`;
  md += `| **Expected relevant** | ${m.confusionMatrix.TP} | ${m.confusionMatrix.FN} |\n`;
  md += `| **Expected not relevant** | ${m.confusionMatrix.FP} | ${m.confusionMatrix.TN} |\n\n`;
  md += `## TOP 50 Failures\n\n`;
  for (let i = 0; i < report.top50Failures.length; i++) {
    const f = report.top50Failures[i]!;
    md += `### ${i + 1}. ${f.testCaseId} (${f.dataset}) — ${f.failureCategory}\n\n`;
    md += `- **Category:** ${f.category}\n`;
    md += `- **Severity:** ${f.severity}\n`;
    md += `- **Confidence:** ${f.confidence ?? "n/a"}\n`;
    md += `- **Classification correct:** ${f.classificationCorrect}\n`;
    md += `- **Extraction correct:** ${f.extractionCorrect}\n\n`;
    md += `**Input**\n\n\`\`\`json\n${JSON.stringify(f.input, null, 2)}\n\`\`\`\n\n`;
    if (f.ocrOutput) {
      md += `**OCR output**\n\n\`\`\`json\n${JSON.stringify(f.ocrOutput, null, 2)}\n\`\`\`\n\n`;
    }
    md += `**Expected output**\n\n\`\`\`json\n${JSON.stringify(f.expectedOutput, null, 2)}\n\`\`\`\n\n`;
    md += `**Actual output**\n\n\`\`\`json\n${JSON.stringify(f.actualOutput, null, 2)}\n\`\`\`\n\n`;
    if (f.classification) {
      md += `**Classification**\n\n\`\`\`json\n${JSON.stringify(f.classification, null, 2)}\n\`\`\`\n\n`;
    }
    if (Array.isArray(f.fieldResults) && (f.fieldResults as unknown[]).length) {
      md += `**Wrong fields**\n\n\`\`\`json\n${JSON.stringify(f.fieldResults, null, 2)}\n\`\`\`\n\n`;
    }
    if (f.error) md += `**Error:** ${f.error}\n\n`;
    md += `---\n\n`;
  }
  return md;
}

function plainFailureLabel(category: string | null | undefined): string {
  switch (category) {
    case "pipeline_error":
      return "The worker crashed or could not finish (API, JSON, or validation error).";
    case "false_positive":
      return "Email should have been skipped but was marked relevant.";
    case "false_negative":
      return "Email should have been processed but was marked not relevant.";
    case "false_positive_extraction_leak":
      return "Email was skipped but still filled in field values (data leak).";
    case "ocr_or_parse_empty":
      return "Attachment text was missing or empty, so extraction could not use the file.";
    case "extraction_field_mismatch":
      return "Relevance was OK but one or more fields were wrong or empty.";
    default:
      return category ?? "Unknown problem.";
  }
}

function buildSimpleMarkdown(
  report: {
    generatedAt: string;
    config: Record<string, unknown>;
    metrics: Record<string, unknown>;
    top50Failures: Array<Record<string, unknown>>;
    allResults?: Array<{ testCaseId: string; dataset: string; riskLevel: string; error: string | null }>;
  },
  casesRun: number,
): string {
  const m = report.metrics as {
    classificationAccuracy: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
    confusionMatrix: { TP: number; FP: number; TN: number; FN: number };
    fieldLevelAccuracy: number;
    overallExtractionAccuracy: number;
    overallExtractionAccuracyRelevantOnly: number;
    pipelineErrors: number;
    extractPass: number;
    extractDenom: number;
  };

  const failures = report.top50Failures;
  const byCategory = new Map<string, number>();
  for (const f of failures) {
    const cat = String(f.failureCategory ?? "unknown");
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
  }

  const classOk = Math.round(m.classificationAccuracy * casesRun);
  const extractOk = m.extractDenom ? m.extractPass : 0;
  const extractTotal = m.extractDenom || 0;

  let md = `# Volatile 50 test — simple report\n\n`;
  md += `**When:** ${report.generatedAt}\n\n`;
  md += `This run used the **50 hardest test emails** (bad PDFs, injections, conflicts, OCR stress). `;
  md += `Same steps as the real worker: classify → read attachments → extract → compare to expected answers.\n\n`;

  md += `## Bottom line\n\n`;
  md += `- **${classOk} of ${casesRun}** emails: correct “should we process this?” decision.\n`;
  md += `- **${extractOk} of ${extractTotal}** relevant emails: all fields matched what we expected.\n`;
  md += `- **${failures.length} of ${casesRun}** cases had at least one problem.\n`;
  md += `- **${m.pipelineErrors}** cases: hard errors (API/JSON/validation), not just wrong fields.\n\n`;

  md += `## What went wrong (in plain English)\n\n`;
  md += `| Problem type | Count | What it means |\n`;
  md += `|--------------|------:|---------------|\n`;
  for (const [cat, n] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
    md += `| ${cat} | ${n} | ${plainFailureLabel(cat)} |\n`;
  }
  md += `\n`;

  md += `## Confusion (relevance only)\n\n`;
  md += `- Correctly processed when should: **${m.confusionMatrix.TP}**\n`;
  md += `- Correctly skipped when should: **${m.confusionMatrix.TN}**\n`;
  md += `- Processed when should skip (false alarm): **${m.confusionMatrix.FP}**\n`;
  md += `- Skipped when should process (missed): **${m.confusionMatrix.FN}**\n\n`;

  md += `## Why these 50 fail more often\n\n`;
  md += `1. **Wrong words, right idea** — e.g. model says "Billing discrepancy" instead of exact code \`billing_dispute\`.\n`;
  md += `2. **Missing priority** — email does not say low/medium/high clearly; model leaves null.\n`;
  md += `3. **Attachments** — corrupt/scanned/zip files often have **no readable text**; extract uses body only or fails.\n`;
  md += `4. **v2 attachment fields** — pipeline does not fill per-file invoice fields yet (known gap).\n`;
  md += `5. **Trick emails** — injection text, irrelevant newsletters, body vs PDF conflict.\n\n`;

  md += `## Highest-error cases (top 15)\n\n`;
  const top = failures.slice(0, 15);
  for (let i = 0; i < top.length; i++) {
    const f = top[i]!;
    const wrong = (f.fieldResults as Array<{ field: string }> | undefined)?.map((x) => x.field) ?? [];
    md += `${i + 1}. **${f.testCaseId}** (${f.dataset}) — ${plainFailureLabel(String(f.failureCategory))}\n`;
    if (wrong.length) md += `   - Wrong or missing: ${wrong.join(", ")}\n`;
    if (f.error) md += `   - Error: ${f.error}\n`;
  }
  md += `\n`;

  md += `## What to do first\n\n`;
  if (m.pipelineErrors > 0) {
    md += `1. Fix **${m.pipelineErrors} crash(es)** first (check OpenRouter key, JSON errors in logs).\n`;
  }
  if ((byCategory.get("extraction_field_mismatch") ?? 0) > 0) {
    md += `2. Use **enum fields** in the schema for codes like \`issue_type\` and \`priority\`, or compare answers loosely in tests.\n`;
  }
  if ((byCategory.get("ocr_or_parse_empty") ?? 0) > 0) {
    md += `3. Check **PaddleOCR** config and fixture files for attachment tests.\n`;
  }
  if ((byCategory.get("false_positive") ?? 0) + (byCategory.get("false_negative") ?? 0) > 0) {
    md += `4. Tune **classification prompt** (less “always relevant” bias).\n`;
  }
  md += `5. See full detail in \`EVALUATION-REPORT-VOLATILE50.md\` and \`evaluation-report-volatile50.json\`.\n`;

  return md;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
