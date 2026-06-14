/**
 * Red-team adversarial eval — 200+ scenarios (test harness only).
 *
 *   bun --env-file=../../.env src/scripts/runRedTeamHarness.ts --generate-only
 *   bun --env-file=../../.env src/scripts/runRedTeamHarness.ts --direct --limit 20
 *   bun --env-file=../../.env src/scripts/runRedTeamHarness.ts --queue --limit 50
 *
 * Requires worker for --queue. OPENROUTER_API_KEY for --direct/--queue.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { and, asc, eq, inArray, like } from "drizzle-orm";
import { loadEnv } from "@repo/config";
import { createDb } from "@repo/db";
import { emails, emailAttachments, userQueries } from "@repo/db/schema";
import { createEmailService } from "@repo/feature-email";
import { createIngestionServices } from "@repo/feature-ingestion";
import { createRedisConnection } from "@repo/feature-queue";
import { EmailProvider } from "@repo/types/email";
import type { UserQueryRow } from "@repo/types/userQuery";
import type { WorkerAttachmentRow } from "@repo/types/workerProcessing";
import { buildMinimalPdf } from "../../../../docs/test-data/fixtures/dummyAttachmentBuilder";
import { buildAllRedTeamScenarios } from "../../../../docs/test-data/red-team/buildScenarios";
import {
  aggregateMetrics,
  evaluateScenario,
  type ScenarioRunResult,
} from "../../../../docs/test-data/red-team/evaluate";
import type { RedTeamScenario } from "../../../../docs/test-data/red-team/types";
import { E2ELogger } from "../../../../docs/test-data/e2e/logger";
import {
  createEmailProcessingQueue,
  enqueueEmailJobsBulk,
} from "../gurdeep-cron/email-provider/provider/emailQueueProvider";

const OUTPUT = join(import.meta.dir, "../../../../docs/test-data/red-team/output");
const MESSAGE_PREFIX = "redteam-";

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = Infinity;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) limit = Number(args[++i]);
  }
  const generateOnly = args.includes("--generate-only");
  const queue = args.includes("--queue") || !generateOnly;
  return {
    generateOnly,
    direct: false,
    queue,
    limit,
    concurrency: 2,
    pollTimeoutMs: 7_200_000,
    pollIntervalMs: 8_000,
  };
}

async function writeJson(name: string, data: unknown) {
  await writeFile(join(OUTPUT, name), JSON.stringify(data, null, 2), "utf-8");
}

function exportDataset(scenarios: RedTeamScenario[]) {
  return scenarios.map((s) => ({
    id: s.id,
    tier: s.tier,
    category: s.category,
    title: s.title,
    email: {
      sender: s.sender,
      recipient: s.recipient,
      subject: s.subject,
      body: s.body,
    },
    attachments: s.attachments,
    parsed_attachments: s.attachments.map((a) => ({
      filename: a.filename,
      document_type: a.documentType,
      extracted_text: a.extractedText,
    })),
    user_query: s.userQuery,
    output_schema: s.outputSchema,
    ground_truth: s.groundTruth,
    expected_failure_mode: s.expectedFailureMode,
    evaluation_notes: s.evaluationNotes,
    tags: s.tags,
  }));
}

async function runDirectPipeline(
  scenarios: RedTeamScenario[],
  log: E2ELogger,
  concurrency: number,
): Promise<ScenarioRunResult[]> {
  const env = loadEnv();
  if (!env.openRouter.apiKey) {
    log.error("OPENROUTER_API_KEY required for --direct");
    process.exit(1);
  }

  const { createExtractionServices } = await import("@repo/feature-extraction");
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

  const results: ScenarioRunResult[] = [];
  let idx = 0;

  async function worker() {
    while (idx < scenarios.length) {
      const i = idx++;
      const s = scenarios[i]!;
      const t0 = Date.now();
      log.info(`[DIRECT] ${s.id} ${s.category} — start`);

      const uq: UserQueryRow = {
        id: `rt-${s.id}`,
        userQuery: s.userQuery,
        outputSchema: s.outputSchema,
        status: "active",
        createdAt: new Date(),
      };

      try {
        const attachRows: WorkerAttachmentRow[] = s.attachments.map((a, j) => ({
          id: `rt-att-${j}`,
          filename: a.filename,
          mimeType: a.mimeType,
          sizeBytes: a.extractedText.length,
          localPath: `/redteam/${s.id}/${a.filename}`,
          extractedText: a.extractedText,
          extractSource: "redteam_seed",
        }));

        const classifyInput = {
          userQuery: uq,
          subject: s.subject,
          sender: s.sender,
          rawContent: s.body,
          attachments: attachRows.map((a) => ({ filename: a.filename, mimeType: a.mimeType })),
        };

        let extracted: Record<string, unknown> = {};
        let relevant: boolean | null = null;

        if (attachRows.length === 0) {
          const r = await services.classifyAndExtract.classifyAndExtract(classifyInput);
          relevant = r.classification.relevant;
          if (r.parsed?.email) extracted = r.parsed.email as Record<string, unknown>;
        } else {
          const classification = await services.classify.classify(classifyInput);
          relevant = classification.relevant;
          if (classification.relevant) {
            const final = await services.finalExtract.extract({
              userQuery: uq,
              subject: s.subject,
              sender: s.sender,
              rawContent: s.body,
              attachmentRows: attachRows,
            });
            extracted = final.email as Record<string, unknown>;
          }
        }

        const ev = evaluateScenario(s, extracted, {
          error: null,
          duration_ms: Date.now() - t0,
          classification_relevant: relevant,
        });
        results[i] = ev;
        log.info(
          `[DIRECT] ${s.id} — ${ev.exact_match ? "PASS" : "FAIL"} ${ev.failure_category ?? ""} (${ev.duration_ms}ms)`,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results[i] = evaluateScenario(s, {}, { error: msg, duration_ms: Date.now() - t0 });
        log.error(`[DIRECT] ${s.id} — ERROR: ${msg}`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, scenarios.length) }, () => worker()),
  );
  return results;
}

async function insertAndQueue(
  db: ReturnType<typeof createDb>,
  env: ReturnType<typeof loadEnv>,
  scenarios: RedTeamScenario[],
  log: E2ELogger,
): Promise<string[]> {
  const { attachmentStorage: storage } = createIngestionServices({
    attachmentsRoot: env.attachmentsRoot,
    maxAttachmentSizeMb: env.maxAttachmentSizeMb,
    maxAttachmentsPerEmail: env.maxAttachmentsPerEmail,
  });
  const emailService = createEmailService(db);
  const emailIds: string[] = [];

  for (const s of scenarios) {
    const messageId = `${MESSAGE_PREFIX}${s.id}@redteam.local`;
    const [uq] = await db
      .insert(userQueries)
      .values({
        userQuery: s.userQuery,
        outputSchema: { email: s.outputSchema },
        status: "closed",
      })
      .returning({ id: userQueries.id });

    const files = s.attachments.map((a) => ({
      filename: a.filename,
      mimeType: a.mimeType,
      content: buildMinimalPdf(a.extractedText),
    }));
    const savedFiles = await storage.saveAll(EmailProvider.Gmail, messageId, files);

    const [emailRow] = await db
      .insert(emails)
      .values({
        provider: EmailProvider.Gmail,
        messageId,
        sender: s.sender,
        subject: s.subject,
        rawContent: s.body,
        attachmentCount: savedFiles.length,
        processingStatus: "pending",
        receivedAt: new Date(),
        userQueryId: uq!.id,
        userQuerySchema: { email: s.outputSchema },
      })
      .onConflictDoNothing()
      .returning({ id: emails.id });

    let emailId = emailRow?.id;
    if (!emailId) {
      const [ex] = await db
        .select({ id: emails.id })
        .from(emails)
        .where(and(eq(emails.provider, EmailProvider.Gmail), eq(emails.messageId, messageId)))
        .limit(1);
      emailId = ex?.id;
    }
    if (!emailId) continue;

    for (const f of savedFiles) {
      const att = s.attachments.find((x) => x.filename === f.filename);
      await db
        .insert(emailAttachments)
        .values({
          emailId,
          filename: f.filename,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes,
          localPath: f.localPath,
          processingStatus: "completed",
          extractedText: att?.extractedText ?? "",
          extractSource: "redteam_seed",
          parsedJson: att ? { document_type: att.documentType } : null,
        })
        .onConflictDoNothing();
    }

    emailIds.push(emailId);
    log.info(`[QUEUE] Inserted ${s.id} → ${emailId.slice(0, 8)}…`);
  }

  const queue = createEmailProcessingQueue(createRedisConnection(env.redisUrl!));
  await enqueueEmailJobsBulk(queue, emailIds.map((emailUuid) => ({ emailUuid })));
  await emailService.markEnqueued(emailIds);
  log.info(`[QUEUE] Enqueued ${emailIds.length} jobs`);
  return emailIds;
}

async function collectQueueResults(
  db: ReturnType<typeof createDb>,
  scenarios: RedTeamScenario[],
): Promise<Map<string, { parsed: Record<string, unknown>; status: string; error: string | null }>> {
  const out = new Map<string, { parsed: Record<string, unknown>; status: string; error: string | null }>();
  const rows = await db
    .select()
    .from(emails)
    .where(like(emails.messageId, `${MESSAGE_PREFIX}%`));

  const byMsg = new Map(rows.map((r) => [r.messageId, r]));
  for (const s of scenarios) {
    const mid = `${MESSAGE_PREFIX}${s.id}@redteam.local`;
    const row = byMsg.get(mid);
    const pj = row?.parsedJson as { email?: Record<string, unknown> } | null;
    out.set(s.id, {
      parsed: (pj?.email ?? pj ?? {}) as Record<string, unknown>,
      status: row?.processingStatus ?? "missing",
      error: row?.processingStatus === "failed" ? "worker_failed" : null,
    });
  }
  return out;
}

function buildSegmentReports(results: ScenarioRunResult[], scenarios: RedTeamScenario[]) {
  const failures = results.filter((r) => !r.exact_match || r.processing_status === "error");

  const hallucination = results.filter((r) => r.hallucination_detected);
  const injection = results.filter((r) => r.injection_leak_detected);
  const conflict = results.filter((r) =>
    ["source_conflict", "conflict_reporting", "attachment_priority"].includes(r.category),
  );
  const schema = results.filter((r) => r.category === "schema_stress");

  return {
    hallucination_report: {
      count: hallucination.length,
      rate: (hallucination.length / results.length) * 100,
      cases: hallucination.map((r) => ({
        scenario_id: r.scenario_id,
        actual: r.actual_result,
        root_cause: r.root_cause,
      })),
    },
    prompt_injection_report: {
      injection_leak_count: injection.length,
      scenarios_tested: scenarios.filter((s) => s.tags.includes("prompt_injection")).length,
      leaked: injection,
    },
    conflict_resolution_report: {
      total: conflict.length,
      passed: conflict.filter((r) => r.exact_match).length,
      failed: conflict.filter((r) => !r.exact_match),
    },
    schema_compliance_report: {
      total: schema.length,
      compliant: schema.filter((r) => r.schema_compliant).length,
      exact_match: schema.filter((r) => r.exact_match).length,
      failures: schema.filter((r) => !r.schema_compliant || !r.exact_match),
    },
    error_analysis: failures.map((r) => {
      const s = scenarios.find((x) => x.id === r.scenario_id);
      return {
        scenario_id: r.scenario_id,
        tier: r.tier,
        category: r.category,
        query: s?.userQuery,
        expected: s?.groundTruth,
        actual: r.actual_result,
        error_type: r.failure_category,
        difference: r.root_cause,
        input_summary: s
          ? { subject: s.subject, attachment_count: s.attachments.length }
          : null,
      };
    }),
  };
}

async function main() {
  const args = parseArgs();
  await mkdir(OUTPUT, { recursive: true });
  const log = new E2ELogger(join(OUTPUT, "worker_execution.log"));

  const allScenarios = buildAllRedTeamScenarios();
  const scenarios = allScenarios.slice(0, args.limit);
  log.info(`Red-team dataset: ${allScenarios.length} total, running ${scenarios.length}`);

  const dataset = exportDataset(scenarios);
  await writeJson("dataset.json", { meta: { total: allScenarios.length, run: scenarios.length }, scenarios: dataset });
  await writeJson(
    "user_queries.json",
    scenarios.map((s) => ({
      scenario_id: s.id,
      userQuery: s.userQuery,
      outputSchema: s.outputSchema,
    })),
  );
  await writeJson(
    "ground_truth.json",
    scenarios.map((s) => ({ scenario_id: s.id, expected_result: s.groundTruth, expected_failure_mode: s.expectedFailureMode })),
  );

  if (args.generateOnly) {
    log.info("Generate-only complete");
    return;
  }

  if (args.direct) {
    log.error("Use apps/worker: bun --env-file=../../.env src/scripts/runRedTeamHarness.ts --direct");
    process.exit(1);
  }

  const runStart = Date.now();
  let results: ScenarioRunResult[] = [];

  if (args.queue) {
    const env = loadEnv();
    if (!env.databaseUrl || !env.redisUrl) {
      log.error("DATABASE_URL and REDIS_URL required");
      process.exit(1);
    }
    const db = createDb(env.databaseUrl);
    log.info("Queue mode: insert + enqueue (worker must be running)");
    const emailIds = await insertAndQueue(db, env, scenarios, log);

    const terminal = new Set(["completed", "failed", "partial", "skipped"]);
    const t0 = Date.now();
    while (Date.now() - t0 < args.pollTimeoutMs) {
      const rows = await db
        .select({ id: emails.id, processingStatus: emails.processingStatus })
        .from(emails)
        .where(inArray(emails.id, emailIds));
      const done = rows.filter((r) => terminal.has(r.processingStatus)).length;
      log.info(`[QUEUE] Progress ${done}/${emailIds.length}`);
      if (done >= emailIds.length) break;
      await Bun.sleep(args.pollIntervalMs);
    }

    const collected = await collectQueueResults(db, scenarios);
    for (const s of scenarios) {
      const c = collected.get(s.id)!;
      results.push(
        evaluateScenario(s, c.parsed, {
          error: c.status === "failed" ? c.error : c.status === "pending" ? "timeout" : null,
          duration_ms: 0,
        }),
      );
    }
  }

  const metrics = aggregateMetrics(results, scenarios);
  const segments = buildSegmentReports(results, scenarios);

  await writeJson("actual_results.json", results.map((r) => ({
    scenario_id: r.scenario_id,
    actual_result: r.actual_result,
    exact_match: r.exact_match,
    failure_category: r.failure_category,
  })));
  await writeJson("accuracy_report.json", { metrics, per_tier: groupByTier(results) });
  await writeJson("hallucination_report.json", segments.hallucination_report);
  await writeJson("prompt_injection_report.json", segments.prompt_injection_report);
  await writeJson("conflict_resolution_report.json", segments.conflict_resolution_report);
  await writeJson("schema_compliance_report.json", segments.schema_compliance_report);
  await writeJson("error_report.json", { failures: segments.error_analysis });

  const md = buildFinalReport(metrics, segments, scenarios.length, Date.now() - runStart, args);
  await writeFile(join(OUTPUT, "final_red_team_report.md"), md);

  log.info(
    `Red-team complete: ${metrics.passedScenarios}/${metrics.totalScenarios} passed (${metrics.exactMatchAccuracy.toFixed(1)}% exact)`,
  );
  log.info(`Hallucination rate: ${metrics.hallucinationRate.toFixed(1)}% | Conflict accuracy: ${metrics.conflictDetectionAccuracy.toFixed(1)}%`);
  log.info(`Output: ${OUTPUT}`);
}

function groupByTier(results: ScenarioRunResult[]) {
  const m: Record<string, { pass: number; total: number }> = {};
  for (const r of results) {
    m[r.tier] = m[r.tier] ?? { pass: 0, total: 0 };
    m[r.tier]!.total++;
    if (r.exact_match) m[r.tier]!.pass++;
  }
  return m;
}

function buildFinalReport(
  metrics: ReturnType<typeof aggregateMetrics>,
  segments: ReturnType<typeof buildSegmentReports>,
  n: number,
  durationMs: number,
  args: ReturnType<typeof parseArgs>,
) {
  return `# Red Team Report — Email + Attachment Extraction Pipeline

Generated: ${new Date().toISOString()}
Mode: ${args.queue ? "queue worker" : "direct pipeline"}
Scenarios run: ${n}

## Mission

Adversarial testing to **break** extraction — not maximize happy-path accuracy.

## Aggregate metrics

| Metric | Value |
|--------|-------|
| Exact match accuracy | ${metrics.exactMatchAccuracy.toFixed(2)}% |
| Field accuracy | ${metrics.fieldAccuracy.toFixed(2)}% |
| Passed / Failed | ${metrics.passedScenarios} / ${metrics.failedScenarios} |
| Pipeline errors | ${metrics.pipelineErrors} |
| Hallucination rate | ${metrics.hallucinationRate.toFixed(2)}% |
| Missing-value rate | ${metrics.missingValueRate.toFixed(2)}% |
| OCR recovery rate | ${metrics.ocrErrorRecoveryRate.toFixed(2)}% |
| Conflict detection accuracy | ${metrics.conflictDetectionAccuracy.toFixed(2)}% |
| Schema compliance (stress) | ${metrics.schemaComplianceRate.toFixed(2)}% |
| Prompt injection defense | ${metrics.promptInjectionSuccessRate.toFixed(2)}% |
| F1 (field-level) | ${metrics.f1Score.toFixed(4)} |
| Avg duration (direct) | ${metrics.avgDurationMs.toFixed(0)} ms |
| Total wall time | ${(durationMs / 1000).toFixed(0)} s |

## Weakness summary

- **Conflict resolution**: ${segments.conflict_resolution_report.failed.length} failures / ${segments.conflict_resolution_report.total} conflict cases
- **Hallucination**: ${segments.hallucination_report.count} cases fabricated values
- **Prompt injection leaks**: ${segments.prompt_injection_report.injection_leak_count}
- **Schema stress**: ${segments.schema_compliance_report.failures.length} non-compliant or wrong

## Top failure categories

${summarizeFailures(segments.error_analysis)}

## Deliverables

See \`docs/test-data/red-team/output/\` for JSON reports and \`worker_execution.log\`.

## Recommendations

1. Add explicit source-priority rules in final-extract prompt (email vs attachment).
2. Add conflict fields to schema when query asks for conflict_detected.
3. Stricter null enforcement for missing-entity queries.
4. Post-LLM validation for injection markers in string fields.
5. Cap output schema size or chunk large schemas.
`;
}

function summarizeFailures(errors: Array<{ error_type: string | null }>) {
  const c = new Map<string, number>();
  for (const e of errors) {
    const k = e.error_type ?? "unknown";
    c.set(k, (c.get(k) ?? 0) + 1);
  }
  return [...c.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k, n]) => `- ${k}: ${n}`)
    .join("\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
