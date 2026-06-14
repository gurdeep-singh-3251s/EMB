/**
 * End-to-end smoke test (no IMAP, no Redis worker — processes in-process).
 *
 * From repo root:
 *   bun --env-file=.env apps/worker/src/scripts/smokeTestPipeline.ts
 *
 * Requires: PostgreSQL, OPENROUTER_API_KEY, `bun run db:push`
 */
import { createDb } from "@repo/db";
import { createEmailRepo } from "@repo/feature-email";
import { createAttachmentRepo } from "@repo/feature-attachment";
import { createUserQueryRepo, wrapOutputSchema } from "@repo/feature-user-query";
import { loadEnv } from "@repo/config";
import { EmailProvider } from "@repo/types/email";
import type { CreateUserQueryInput } from "@repo/types/userQuery";
import ServiceProvider from "../serviceProvider";

type SmokeSchemaField = {
  type: "string";
  nullable: true;
};

type SmokeDefaultSchema = CreateUserQueryInput["outputSchema"];

const env = loadEnv();

if (!env.databaseUrl) {
  console.error("DATABASE_URL is missing in .env");
  process.exit(1);
}
if (!env.openRouter.apiKey) {
  console.error("OPENROUTER_API_KEY is missing in .env");
  process.exit(1);
}

const db = createDb(env.databaseUrl);
const emailRepo = createEmailRepo(db);
const attachmentRepo = createAttachmentRepo(db);
const userQueryRepo = createUserQueryRepo(db);
const worker = new ServiceProvider(env, db);

const customerNameField: SmokeSchemaField = { type: "string", nullable: true };
const issueTypeField: SmokeSchemaField = { type: "string", nullable: true };
const priorityField: SmokeSchemaField = { type: "string", nullable: true };
const invoiceNumberField: SmokeSchemaField = { type: "string", nullable: true };

const defaultSchema: SmokeDefaultSchema = {
  customer_name: customerNameField,
  issue_type: issueTypeField,
  priority: priorityField,
  invoice_number: invoiceNumberField,
};

let active = await userQueryRepo.getActive();
if (!active) {
  console.log("[smoke] No active user query — creating one…");
  active = await userQueryRepo.createActive({
    userQuery: "Find billing issues, customer names, priority, and invoice numbers in support emails.",
    outputSchema: defaultSchema,
  });
  console.log("[smoke] Created user query:", active.id);
} else {
  console.log("[smoke] Using active user query:", active.id);
}

const messageId = `smoke-${Date.now()}@local`;
const emailId = await emailRepo.savePendingEmail({
  provider: EmailProvider.Gmail,
  messageId,
  sender: "test@example.com",
  subject: "Invoice #INV-1001 billing issue",
  rawContent:
    "Hi, I am John Doe. I have a billing issue with invoice #INV-1001. Priority: high. Please help.",
  attachmentCount: 0,
  receivedAt: new Date(),
  userQueryId: active.id,
  userQuerySchema: wrapOutputSchema(active.outputSchema),
});

await attachmentRepo.saveAttachments(emailId, []);
console.log("[smoke] Processing email:", emailId);

const result = await worker.emailProcessing.process({
  data: { emailUuid: emailId },
  attemptsMade: 0,
});

if (!result.success) {
  console.error("[smoke] FAILED:", result.message, result.error);
  process.exit(1);
}

const row = await emailRepo.byId(emailId);
console.log("\n[smoke] SUCCESS");
console.log("  status:", row?.processingStatus);
console.log("  classification:", JSON.stringify(row?.classificationResult, null, 2));
console.log("  parsed_json:", JSON.stringify(row?.parsedJson, null, 2));

process.exit(0);
