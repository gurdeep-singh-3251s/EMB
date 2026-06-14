/**
 * Seeds dummy emails into Postgres + attachments + BullMQ (real worker path).
 *
 *   bun docs/test-data/select-extraction-sample.ts 12
 *   bun --env-file=.env apps/server/src/scripts/seedDummyWorkerEmails.ts
 *
 * Requires: DATABASE_URL, REDIS_URL, worker running (`bun run dev:worker`)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnv } from "@repo/config";
import { createDb } from "@repo/db/client";
import { createEmailService } from "@repo/feature-email";
import { createAttachmentRepo } from "@repo/feature-attachment";
import { createUserQueryRepo } from "@repo/feature-user-query";
import { createIngestionServices } from "@repo/feature-ingestion";
import { createRedisConnection } from "@repo/feature-queue";
import { EmailProvider } from "@repo/types/email";
import {
  buildMinimalDocx,
  buildMinimalPdf,
  attachmentTextContent,
  type DummyAttachmentSpec,
} from "../../../docs/test-data/fixtures/dummyAttachmentBuilder";
import {
  createEmailProcessingQueue,
  enqueueEmailJobsBulk,
} from "../gurdeep-cron/email-provider/provider/emailQueueProvider";

const REPO_ROOT = join(import.meta.dir, "../../..");
const TEST_DATA_ROOT = join(REPO_ROOT, "docs/test-data");

function parseArgs() {
  const args = process.argv.slice(2);
  let manifest = join(TEST_DATA_ROOT, "extraction-sample-manifest.json");
  let limit = Infinity;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--manifest" && args[i + 1]) manifest = args[++i]!;
    if (args[i] === "--limit" && args[i + 1]) limit = Number(args[++i]);
  }
  return {
    manifestPath: manifest.startsWith("/") || /^[A-Za-z]:/.test(manifest)
      ? manifest
      : join(REPO_ROOT, manifest),
    limit,
  };
}

function attachmentBuffer(spec: DummyAttachmentSpec): Buffer {
  const text = attachmentTextContent(spec);
  if (spec.condition === "corrupt") {
    return Buffer.from([0x25, 0x50, 0x44, 0x46, 0xff, 0x00, 0x11]);
  }
  if (spec.mimeType.startsWith("text/") || spec.filename.endsWith(".txt")) {
    return Buffer.from(text, "utf-8");
  }
  if (spec.mimeType.includes("wordprocessingml") || spec.filename.endsWith(".docx")) {
    return buildMinimalDocx(text);
  }
  return buildMinimalPdf(text);
}

async function main() {
  const { manifestPath, limit } = parseArgs();
  const env = loadEnv();
  if (!env.databaseUrl) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as {
    cases: Array<{ id: string; userQueryId: string }>;
  };

  const v2 = JSON.parse(readFileSync(join(TEST_DATA_ROOT, "multi-query-extraction-test-cases.json"), "utf-8")) as {
    userQueries: Array<{
      id: string;
      userQuery: string;
      outputSchema: { email: { body: Record<string, unknown> }; attachment: Record<string, unknown> };
    }>;
    testCases: Array<{
      id: string;
      userQueryId: string;
      emailSubject: string;
      emailBody: string;
      attachments: DummyAttachmentSpec[];
    }>;
  };

  const profileMap = new Map(v2.userQueries.map((p) => [p.id, p]));
  const caseMap = new Map(v2.testCases.map((c) => [c.id, c]));
  const db = createDb(env.databaseUrl);
  const userQueryRepo = createUserQueryRepo(db);
  const emailService = createEmailService(db);
  const attachmentRepo = createAttachmentRepo(db);
  const { attachmentStorage: storage } = createIngestionServices({
    attachmentsRoot: env.attachmentsRoot,
    maxAttachmentSizeMb: env.maxAttachmentSizeMb,
    maxAttachmentsPerEmail: env.maxAttachmentsPerEmail,
  });
  const queue = createEmailProcessingQueue(createRedisConnection(env.redisUrl));

  const selected = manifest.cases.slice(0, limit);
  console.log(`Seeding ${selected.length} dummy emails for worker…`);

  for (const m of selected) {
    const tc = caseMap.get(m.id);
    const profile = profileMap.get(m.userQueryId);
    if (!tc || !profile) continue;

    await userQueryRepo.deactivateAllActive();
    const uq = await userQueryRepo.createActive({
      userQuery: profile.userQuery,
      outputSchema: profile.outputSchema.email.body as Record<string, unknown>,
    });

    const messageId = `dummy-${tc.id}@eval.local`;
    const files = (tc.attachments ?? []).map((a) => ({
      filename: a.filename,
      mimeType: a.mimeType,
      content: attachmentBuffer(a),
    }));

    const savedAttachments = await storage.saveAll(EmailProvider.Gmail, messageId, files);

    const saved = await emailService.savePendingEmails([
      {
        provider: EmailProvider.Gmail,
        messageId,
        sender: "dummy.test@eval.local",
        subject: tc.emailSubject,
        rawContent: tc.emailBody,
        attachmentCount: savedAttachments.length,
        receivedAt: new Date(),
        userQueryId: uq.id,
        userQuerySchema: { email: profile.outputSchema.email.body },
      },
    ]);

    if (!saved.success || saved.data.length === 0) {
      console.error(`Failed to save email ${tc.id}`, saved);
      continue;
    }

    const emailId = saved.data[0]!.id;
    await attachmentRepo.insertManyForEmails(
      savedAttachments.map((a) => ({
        emailId,
        filename: a.filename,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        localPath: a.localPath,
      })),
    );

    await enqueueEmailJobsBulk(queue, [{ emailUuid: emailId }]);
    const markRes = await emailService.markEnqueued([emailId]);
    if (!markRes.success) console.warn(`markEnqueued ${tc.id}:`, markRes.message);

    console.log(`  queued ${tc.id} → ${emailId} (query ${uq.id.slice(0, 8)}…)`);
  }

  console.log("Done. Watch worker (`bun run dev:worker`) for results in DB / API.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
