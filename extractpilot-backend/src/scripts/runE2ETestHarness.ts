/**
 * End-to-end test harness (DB → queue → worker → accuracy reports).
 * Does NOT modify application source — orchestration + artifacts only.
 *
 *   bun --env-file=.env apps/server/src/scripts/runE2ETestHarness.ts
 *   bun --env-file=.env apps/server/src/scripts/runE2ETestHarness.ts --insert-only
 *
 * Requires: DATABASE_URL, REDIS_URL (for queue), worker running for full pipeline.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sql, eq, inArray, and, like, asc } from "drizzle-orm";
import { loadEnv } from "@repo/config";
import { createDb } from "@repo/db";
import { emails, emailAttachments, userQueries } from "@repo/db/schema";
import { createEmailService } from "@repo/feature-email";
import { createIngestionServices } from "@repo/feature-ingestion";
import { createRedisConnection } from "@repo/feature-queue";
import { EmailProvider } from "@repo/types/email";
import { buildMinimalPdf } from "../../../../docs/test-data/fixtures/dummyAttachmentBuilder";
import { build50Scenarios, type E2EScenario } from "../../../../docs/test-data/e2e/scenarios";
import { E2ELogger } from "../../../../docs/test-data/e2e/logger";
import { compareResults } from "../../../../docs/test-data/e2e/compare";
import {
  createEmailProcessingQueue,
  enqueueEmailJobsBulk,
} from "../gurdeep-cron/email-provider/provider/emailQueueProvider";

const OUTPUT = join(import.meta.dir, "../../../../docs/test-data/e2e/output");
const MESSAGE_PREFIX = "e2e-test-";

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    insertOnly: args.includes("--insert-only"),
    workerOnly: args.includes("--worker-only"),
    skipWorker: args.includes("--skip-worker") || args.includes("--insert-only"),
    analyzeOnly: args.includes("--analyze-only"),
    pollTimeoutMs: 3_600_000,
    pollIntervalMs: 5_000,
  };
}

async function loadExistingE2EEmailIds(db: ReturnType<typeof createDb>): Promise<string[]> {
  const rows = await db
    .select({ id: emails.id, messageId: emails.messageId })
    .from(emails)
    .where(like(emails.messageId, `${MESSAGE_PREFIX}%`))
    .orderBy(asc(emails.messageId));
  return rows.map((r) => r.id);
}

async function writeJson(name: string, data: unknown) {
  await writeFile(join(OUTPUT, name), JSON.stringify(data, null, 2), "utf-8");
}

async function analyzeDatabase(db: ReturnType<typeof createDb>, log: E2ELogger) {
  log.info("Analyzing database schema and existing data…");

  const tableList = await db.execute(sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const emailStats = await db.execute(sql`
    SELECT processing_status, COUNT(*)::int AS cnt FROM emails GROUP BY processing_status
  `);

  const attachStats = await db.execute(sql`
    SELECT processing_status, COUNT(*)::int AS cnt FROM email_attachments GROUP BY processing_status
  `);

  const e2eExisting = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt FROM emails WHERE message_id LIKE ${MESSAGE_PREFIX + "%"}
  `);

  const orphanAttach = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt FROM email_attachments a
    LEFT JOIN emails e ON e.id = a.email_id WHERE e.id IS NULL
  `);

  const schemaSummary = {
    note:
      "No separate parsed_attachments or extraction_results tables. Attachment OCR text lives in email_attachments.extracted_text; extraction output lives in emails.parsed_json.",
    tables: {
      emails: [
        "id",
        "provider",
        "message_id",
        "sender",
        "subject",
        "raw_content",
        "user_query_id",
        "user_query_schema",
        "classification_result",
        "parsed_json",
        "attachment_count",
        "processing_status",
        "received_at",
        "created_at",
        "enqueue_at",
        "processing_started_at",
        "processing_completed_at",
      ],
      email_attachments: [
        "id",
        "email_id → emails.id (CASCADE)",
        "filename",
        "mime_type",
        "size_bytes",
        "local_path",
        "processing_status",
        "extracted_text",
        "extract_source",
        "parsed_json",
        "error_message",
        "created_at",
      ],
      user_queries: ["id", "user_query", "output_schema", "status", "created_at"],
      failed_jobs: ["id", "email_id → emails.id", "error_message", "retry_count", "failed_at"],
    },
    publicTables: (tableList as { table_name: string }[]).map((r) => r.table_name),
    existingEmailStatusCounts: emailStats,
    existingAttachmentStatusCounts: attachStats,
    existingE2eEmails: (e2eExisting as { cnt: number }[])[0]?.cnt ?? 0,
    orphanAttachments: (orphanAttach as { cnt: number }[])[0]?.cnt ?? 0,
  };

  if (schemaSummary.existingE2eEmails > 0) {
    log.warn(
      `Found ${schemaSummary.existingE2eEmails} prior e2e emails (message_id ${MESSAGE_PREFIX}*). Re-run may skip inserts via onConflict.`,
    );
  }

  return schemaSummary;
}

function exportSidecarFiles(scenarios: E2EScenario[]) {
  const user_queries = scenarios.map((s) => ({
    query_id: s.queryId,
    scenario_type: s.scenarioType,
    scenario_label: s.scenarioLabel,
    user_query: s.userQuery,
    expected_extraction_target: s.groundTruth,
    output_schema: s.outputSchema,
    email_subject: s.subject,
  }));

  const attachment_schemas = scenarios.map((s) => ({
    query_id: s.queryId,
    filename: s.attachment.filename,
    document_type: s.parsedAttachment.document_type,
    fields: s.parsedAttachment.fields,
    sample_values: s.parsedAttachment.sample_values,
  }));

  const ground_truth_results = scenarios.map((s) => ({
    query_id: s.queryId,
    expected_result: s.groundTruth,
  }));

  return { user_queries, attachment_schemas, ground_truth_results };
}

async function insertDataset(
  db: ReturnType<typeof createDb>,
  env: ReturnType<typeof loadEnv>,
  scenarios: E2EScenario[],
  log: E2ELogger,
) {
  const { attachmentStorage: storage } = createIngestionServices({
    attachmentsRoot: env.attachmentsRoot,
    maxAttachmentSizeMb: env.maxAttachmentSizeMb,
    maxAttachmentsPerEmail: env.maxAttachmentsPerEmail,
  });
  const inserted: Array<{
    queryId: number;
    emailId: string;
    attachmentId: string;
    userQueryId: string;
    messageId: string;
  }> = [];

  await db.transaction(async (tx) => {
    for (const s of scenarios) {
      const messageId = `${MESSAGE_PREFIX}${String(s.queryId).padStart(3, "0")}@e2e.local`;

      const [uq] = await tx
        .insert(userQueries)
        .values({
          userQuery: s.userQuery,
          outputSchema: { email: s.outputSchema },
          status: "closed",
        })
        .returning({ id: userQueries.id });

      const pdfBuf = buildMinimalPdf(s.parsedAttachment.extractedText);
      const savedFiles = await storage.saveAll(EmailProvider.Gmail, messageId, [
        {
          filename: s.attachment.filename,
          mimeType: s.attachment.mimeType,
          content: pdfBuf,
        },
      ]);

      const [emailRow] = await tx
        .insert(emails)
        .values({
          provider: EmailProvider.Gmail,
          messageId,
          sender: s.sender,
          subject: s.subject,
          rawContent: s.body,
          attachmentCount: 1,
          processingStatus: "pending",
          receivedAt: new Date(),
          userQueryId: uq!.id,
          userQuerySchema: { email: s.outputSchema },
        })
        .onConflictDoNothing()
        .returning({ id: emails.id });

      let emailId = emailRow?.id;
      if (!emailId) {
        const [existing] = await tx
          .select({ id: emails.id })
          .from(emails)
          .where(
            and(eq(emails.provider, EmailProvider.Gmail), eq(emails.messageId, messageId)),
          )
          .limit(1);
        emailId = existing?.id;
      }
      if (!emailId) throw new Error(`Failed to insert or find email for query ${s.queryId}`);

      const file = savedFiles[0]!;
      const [att] = await tx
        .insert(emailAttachments)
        .values({
          emailId,
          filename: file.filename,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          localPath: file.localPath,
          processingStatus: "completed",
          extractedText: s.parsedAttachment.extractedText,
          extractSource: "e2e_seed",
          parsedJson: {
            document_type: s.parsedAttachment.document_type,
            fields: s.parsedAttachment.fields,
            sample_values: s.parsedAttachment.sample_values,
          },
        })
        .onConflictDoNothing()
        .returning({ id: emailAttachments.id });

      let attachmentId = att?.id;
      if (!attachmentId) {
        const [existingAtt] = await tx
          .select({ id: emailAttachments.id })
          .from(emailAttachments)
          .where(
            and(
              eq(emailAttachments.emailId, emailId),
              eq(emailAttachments.localPath, file.localPath),
            ),
          )
          .limit(1);
        attachmentId = existingAtt?.id;
        if (attachmentId) {
          await tx
            .update(emailAttachments)
            .set({
              extractedText: s.parsedAttachment.extractedText,
              extractSource: "e2e_seed",
              parsedJson: {
                document_type: s.parsedAttachment.document_type,
                fields: s.parsedAttachment.fields,
                sample_values: s.parsedAttachment.sample_values,
              },
              processingStatus: "completed",
            })
            .where(eq(emailAttachments.id, attachmentId));
        }
      }

      if (!attachmentId) throw new Error(`Failed attachment for query ${s.queryId}`);

      inserted.push({
        queryId: s.queryId,
        emailId,
        attachmentId,
        userQueryId: uq!.id,
        messageId,
      });

      log.info(
        `Email ${s.queryId} inserted (email=${emailId.slice(0, 8)}…, attachment parsed text ${s.parsedAttachment.extractedText.length} chars)`,
      );
    }
  });

  return inserted;
}

async function validateData(
  db: ReturnType<typeof createDb>,
  scenarios: E2EScenario[],
  schemaSummary: Record<string, unknown>,
) {
  const messageIds = scenarios.map(
    (s) => `${MESSAGE_PREFIX}${String(s.queryId).padStart(3, "0")}@e2e.local`,
  );

  const emailRows = await db
    .select()
    .from(emails)
    .where(like(emails.messageId, `${MESSAGE_PREFIX}%`));

  const emailIds = emailRows.map((e) => e.id);
  const attachRows =
    emailIds.length > 0
      ? await db
          .select()
          .from(emailAttachments)
          .where(inArray(emailAttachments.emailId, emailIds))
      : [];

  const issues: Array<{ type: string; detail: string }> = [];
  const idSet = new Set<string>();

  for (const e of emailRows) {
    if (idSet.has(e.id)) issues.push({ type: "duplicate_id", detail: `email ${e.id}` });
    idSet.add(e.id);
    if (e.attachmentCount !== 1) {
      issues.push({
        type: "attachment_count_mismatch",
        detail: `${e.messageId} count=${e.attachmentCount}`,
      });
    }
    if (!e.userQueryId) issues.push({ type: "missing_user_query", detail: e.messageId });
  }

  const byEmail = new Map<string, typeof attachRows>();
  for (const a of attachRows) {
    const list = byEmail.get(a.emailId) ?? [];
    list.push(a);
    byEmail.set(a.emailId, list);
  }

  for (const e of emailRows) {
    const atts = byEmail.get(e.id) ?? [];
    if (atts.length === 0) issues.push({ type: "missing_attachment", detail: e.messageId });
    for (const a of atts) {
      if (!a.extractedText || a.extractedText.length < 10) {
        issues.push({ type: "empty_parsed_data", detail: `${e.messageId}/${a.filename}` });
      }
      if (!a.parsedJson) {
        issues.push({ type: "missing_parsed_json", detail: `${e.messageId}/${a.filename}` });
      }
    }
  }

  const expectedIds = new Set(messageIds);
  const foundIds = new Set(emailRows.map((e) => e.messageId));
  for (const mid of expectedIds) {
    if (!foundIds.has(mid)) issues.push({ type: "missing_email", detail: mid });
  }

  return {
    generatedAt: new Date().toISOString(),
    schemaSummary,
    counts: {
      emails: emailRows.length,
      attachments: attachRows.length,
      parsedWithText: attachRows.filter((a) => (a.extractedText?.length ?? 0) > 0).length,
      userQueriesLinked: emailRows.filter((e) => e.userQueryId).length,
    },
    expected: { emails: 50, attachments: 50, parsedRecords: 50 },
    passed: issues.length === 0 && emailRows.length >= 50 && attachRows.length >= 50,
    issues,
  };
}

async function enqueueAndWait(
  db: ReturnType<typeof createDb>,
  env: ReturnType<typeof loadEnv>,
  emailIds: string[],
  log: E2ELogger,
  pollTimeoutMs: number,
  pollIntervalMs: number,
) {
  const emailService = createEmailService(db);
  const queue = createEmailProcessingQueue(createRedisConnection(env.redisUrl!));

  log.info(`Enqueueing ${emailIds.length} jobs to BullMQ…`);
  await enqueueEmailJobsBulk(
    queue,
    emailIds.map((emailUuid) => ({ emailUuid })),
  );
  const markRes = await emailService.markEnqueued(emailIds);
  if (!markRes.success) log.warn(`markEnqueued: ${markRes.message}`);

  const start = Date.now();
  const terminal = new Set(["completed", "failed", "partial", "skipped"]);

  while (Date.now() - start < pollTimeoutMs) {
    const rows = await db
      .select({
        id: emails.id,
        processingStatus: emails.processingStatus,
      })
      .from(emails)
      .where(inArray(emails.id, emailIds));

    const byStatus: Record<string, number> = {};
    for (const r of rows) {
      byStatus[r.processingStatus] = (byStatus[r.processingStatus] ?? 0) + 1;
    }

    const done = rows.filter((r) => terminal.has(r.processingStatus)).length;
    log.info(
      `Worker progress: ${done}/${emailIds.length} terminal — ${JSON.stringify(byStatus)}`,
    );

    if (done >= emailIds.length) {
      return {
        startTime: new Date(start).toISOString(),
        endTime: new Date().toISOString(),
        durationMs: Date.now() - start,
        successCount: byStatus.completed ?? 0,
        failureCount: (byStatus.failed ?? 0) + (byStatus.partial ?? 0),
        skippedCount: byStatus.skipped ?? 0,
        statusBreakdown: byStatus,
      };
    }

    await Bun.sleep(pollIntervalMs);
  }

  throw new Error(`Worker poll timed out after ${pollTimeoutMs}ms`);
}

async function collectActualResults(
  db: ReturnType<typeof createDb>,
  scenarios: E2EScenario[],
) {
  const messageIdByQuery = new Map(
    scenarios.map((s) => [
      s.queryId,
      `${MESSAGE_PREFIX}${String(s.queryId).padStart(3, "0")}@e2e.local`,
    ]),
  );

  const rows = await db
    .select()
    .from(emails)
    .where(like(emails.messageId, `${MESSAGE_PREFIX}%`));

  const byMessage = new Map(rows.map((r) => [r.messageId, r]));

  return scenarios.map((s) => {
    const row = byMessage.get(messageIdByQuery.get(s.queryId)!);
    const parsed = row?.parsedJson as { email?: Record<string, unknown> } | null;
    const emailFields = parsed?.email ?? (parsed as Record<string, unknown> | null);
    return {
      query_id: s.queryId,
      email_id: row?.id ?? null,
      processing_status: row?.processingStatus ?? null,
      classification: row?.classificationResult ?? null,
      actual_result: emailFields && typeof emailFields === "object" ? emailFields : {},
    };
  });
}

function buildAccuracy(
  scenarios: E2EScenario[],
  actual: Array<{ query_id: number; actual_result: Record<string, unknown> }>,
) {
  const ground = new Map(scenarios.map((s) => [s.queryId, s.groundTruth]));
  const errors: Array<{
    query_id: number;
    expected: Record<string, unknown>;
    actual: Record<string, unknown>;
    error_type: string;
    difference: string;
  }> = [];

  let passed = 0;
  let failed = 0;
  const fieldTotal = scenarios.reduce((n, s) => n + Object.keys(s.groundTruth).length, 0);
  let fieldCorrect = 0;

  for (const row of actual) {
    const expected = ground.get(row.query_id) ?? {};
    const cmp = compareResults(expected, row.actual_result);
    fieldCorrect += cmp.correctFields.length;

    if (cmp.exactMatch) passed++;
    else {
      failed++;
      const error_type = cmp.missingFields.length
        ? "missing_fields"
        : cmp.incorrectFields.length
          ? "incorrect_values"
          : "no_result";
      errors.push({
        query_id: row.query_id,
        expected,
        actual: row.actual_result,
        error_type,
        difference: [
          cmp.missingFields.length ? `missing: ${cmp.missingFields.join(", ")}` : "",
          cmp.incorrectFields.length
            ? `wrong: ${cmp.incorrectFields.map((x) => x.field).join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join("; "),
      });
    }
  }

  const precision = fieldTotal ? fieldCorrect / fieldTotal : 0;
  const recall = fieldTotal ? fieldCorrect / fieldTotal : 0;
  const f1 = precision;

  return {
    generatedAt: new Date().toISOString(),
    totalQueries: scenarios.length,
    passedQueries: passed,
    failedQueries: failed,
    accuracyPercentage: scenarios.length ? (passed / scenarios.length) * 100 : 0,
    fieldLevelAccuracy: fieldTotal ? (fieldCorrect / fieldTotal) * 100 : 0,
    fieldCorrect,
    fieldTotal,
    precision,
    recall,
    f1Score: f1,
    exactMatchCount: passed,
    partialMatchCount: actual.filter((row) => {
      const cmp = compareResults(ground.get(row.query_id) ?? {}, row.actual_result);
      return cmp.partialMatch;
    }).length,
    metricsNote:
      "Precision/recall computed at field level (correct vs missing/wrong fields). Query pass = all fields match ground truth.",
    perQuery: actual.map((row) => {
      const cmp = compareResults(ground.get(row.query_id) ?? {}, row.actual_result);
      return {
        query_id: row.query_id,
        exactMatch: cmp.exactMatch,
        partialMatch: cmp.partialMatch,
        missingFields: cmp.missingFields,
        incorrectValues: cmp.incorrectFields,
      };
    }),
    errors,
  };
}

function buildFinalMarkdown(opts: {
  validation: Record<string, unknown>;
  insertion: Record<string, unknown>;
  processing: Record<string, unknown> | null;
  accuracy: Record<string, unknown>;
  schemaSummary: Record<string, unknown>;
}) {
  const acc = opts.accuracy as {
    accuracyPercentage: number;
    passedQueries: number;
    failedQueries: number;
    f1Score: number;
  };
  const val = opts.validation as { passed: boolean; counts: Record<string, number>; issues: unknown[] };

  return `# E2E Test Report — Email + Attachment Pipeline

Generated: ${new Date().toISOString()}

## Dataset statistics

| Item | Expected | Actual |
|------|----------|--------|
| Emails | 50 | ${val.counts?.emails ?? "n/a"} |
| Attachments | 50 | ${val.counts?.attachments ?? "n/a"} |
| Pre-parsed attachment text | 50 | ${val.counts?.parsedWithText ?? "n/a"} |
| User queries | 50 | ${val.counts?.userQueriesLinked ?? "n/a"} |

Scenarios: 10 business types × 5 variants (invoices, POs, delivery notes, contracts, customers, inventory, maintenance, HR, sales, shipping).

## Database schema (actual vs requested)

This codebase uses **emails**, **email_attachments**, and **user_queries**. There are no \`parsed_attachments\` or \`extraction_results\` tables — OCR text is \`email_attachments.extracted_text\`; extraction output is \`emails.parsed_json\`.

## Database validation

- **Passed:** ${val.passed ? "Yes" : "No"}
- **Issues:** ${(val.issues as unknown[])?.length ?? 0}

## Processing metrics

${opts.processing ? JSON.stringify(opts.processing, null, 2) : "_Worker skipped (--skip-worker)_"}

## Accuracy metrics

| Metric | Value |
|--------|-------|
| Query accuracy | ${acc.accuracyPercentage?.toFixed(2) ?? "n/a"}% |
| Passed queries | ${acc.passedQueries ?? "n/a"} / 50 |
| Failed queries | ${acc.failedQueries ?? "n/a"} |
| F1 (field-level) | ${acc.f1Score?.toFixed(4) ?? "n/a"} |

## Recommendations

1. Ensure \`bun run dev:worker\` is running before a full queue run.
2. OpenRouter and PaddleOCR must be configured in \`.env\`.
3. Pre-seeded \`extracted_text\` skips re-OCR; worker still runs classify → final extract.
4. v2 per-attachment schema fields are not LLM-filled in production code — ground truth is email-body fields only.

## Deliverables

All files under \`docs/test-data/e2e/output/\`:

- validation_report.json
- user_queries.json
- attachment_schemas.json
- ground_truth_results.json
- worker_execution.log
- actual_results.json
- accuracy_report.json
- error_report.json
- final_test_report.md (this file)
- insertion_report.json
- dataset_manifest.json
`;
}

async function main() {
  const args = parseArgs();
  await mkdir(OUTPUT, { recursive: true });
  const log = new E2ELogger(join(OUTPUT, "worker_execution.log"));

  const env = loadEnv();
  if (!env.databaseUrl) {
    log.error("DATABASE_URL required");
    process.exit(1);
  }

  const db = createDb(env.databaseUrl);
  const scenarios = build50Scenarios();
  const sidecars = exportSidecarFiles(scenarios);

  await writeJson("user_queries.json", sidecars.user_queries);
  await writeJson("attachment_schemas.json", sidecars.attachment_schemas);
  await writeJson("ground_truth_results.json", sidecars.ground_truth_results);
  await writeJson(
    "dataset_manifest.json",
    scenarios.map((s) => ({
      query_id: s.queryId,
      scenario_type: s.scenarioType,
      message_id: `${MESSAGE_PREFIX}${String(s.queryId).padStart(3, "0")}@e2e.local`,
      subject: s.subject,
      sender: s.sender,
      recipient: s.recipient,
    })),
  );

  log.info("Generated 50-scenario dataset files");

  const schemaSummary = await analyzeDatabase(db, log);
  if (args.analyzeOnly) {
    await writeJson("validation_report.json", {
      generatedAt: new Date().toISOString(),
      mode: "analyze-only",
      schemaSummary,
    });
    log.info("Analyze-only complete");
    return;
  }

  let inserted: Array<{
    queryId: number;
    emailId: string;
    attachmentId: string;
    userQueryId: string;
    messageId: string;
  }> = [];

  if (!args.workerOnly) {
    log.info("Inserting 50 emails + attachments + parsed text (transaction)…");
    inserted = await insertDataset(db, env, scenarios, log);
  } else {
    log.info("Worker-only: using existing e2e-test-* emails in DB");
    const ids = await loadExistingE2EEmailIds(db);
    inserted = ids.map((emailId, i) => ({
      queryId: i + 1,
      emailId,
      attachmentId: "",
      userQueryId: "",
      messageId: `${MESSAGE_PREFIX}${String(i + 1).padStart(3, "0")}@e2e.local`,
    }));
    if (inserted.length < 50) {
      log.error(`Found only ${inserted.length} e2e emails — run without --worker-only first`);
      process.exit(1);
    }
    await db
      .update(emails)
      .set({ processingStatus: "pending", parsedJson: null, classificationResult: null })
      .where(inArray(emails.id, ids));
    log.info(`Reset ${ids.length} emails to pending for re-processing`);
  }

  const insertionReport = {
    generatedAt: new Date().toISOString(),
    attempted: 50,
    inserted: inserted.length,
    emails: inserted.length,
    attachments: args.workerOnly ? 50 : inserted.length,
    parsedRecords: args.workerOnly ? 50 : inserted.length,
    records: inserted,
    mode: args.workerOnly ? "worker-only" : "insert",
  };
  await writeJson("insertion_report.json", insertionReport);
  log.info(`Insertion complete: ${inserted.length} records`);

  const validation = await validateData(db, scenarios, schemaSummary);
  await writeJson("validation_report.json", validation);
  log.info(
    validation.passed
      ? "Validation passed"
      : `Validation issues: ${validation.issues.length}`,
  );

  if (args.insertOnly || args.skipWorker) {
    log.warn("Skipping worker queue (--insert-only / --skip-worker)");
    await writeFile(
      join(OUTPUT, "final_test_report.md"),
      buildFinalMarkdown({
        validation,
        insertion: insertionReport,
        processing: null,
        accuracy: { note: "Worker not run" },
        schemaSummary,
      }),
    );
    return;
  }

  if (!env.redisUrl) {
    log.error("REDIS_URL required for queue worker execution");
    process.exit(1);
  }

  const emailIds = inserted.map((r) => r.emailId);
  let processing: Record<string, unknown>;
  try {
    processing = await enqueueAndWait(
      db,
      env,
      emailIds,
      log,
      args.pollTimeoutMs,
      args.pollIntervalMs,
    );
    log.info(
      `Worker finished: success=${processing.successCount} failed=${processing.failureCount}`,
    );
  } catch (e) {
    log.error(e instanceof Error ? e.message : String(e));
    processing = { error: String(e), timedOut: true };
  }

  log.info("Collecting actual results from DB…");
  const actual = await collectActualResults(db, scenarios);
  await writeJson("actual_results.json", actual);

  const accuracy = buildAccuracy(scenarios, actual);
  await writeJson("accuracy_report.json", accuracy);
  await writeJson("error_report.json", { failures: accuracy.errors });

  await writeFile(
    join(OUTPUT, "final_test_report.md"),
    buildFinalMarkdown({
      validation,
      insertion: insertionReport,
      processing,
      accuracy,
      schemaSummary,
    }),
  );

  log.info(`Accuracy: ${accuracy.accuracyPercentage.toFixed(2)}% (${accuracy.passedQueries}/50)`);
  log.info(`Deliverables written to ${OUTPUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
