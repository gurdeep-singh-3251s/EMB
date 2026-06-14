import { createDb } from "@repo/db";
import { createEmailRepo } from "@repo/feature-email";
import { createAttachmentRepo } from "@repo/feature-attachment";
import { createUserQueryRepo, wrapOutputSchema } from "@repo/feature-user-query";
import { EmailProvider } from "@repo/types/email";
import { loadEnv } from "@repo/config";
import ServiceProvider from "../serviceProvider";

type TestEmailPayload = {
  provider: EmailProvider;
  messageId: string;
  sender: string;
  subject: string;
  rawContent: string;
  receivedAt: string;
  attachments: [];
};

const env = loadEnv();
const db = createDb(env.databaseUrl);
const emailRepo = createEmailRepo(db);
const attachmentRepo = createAttachmentRepo(db);
const userQueryRepo = createUserQueryRepo(db);
const active = await userQueryRepo.getActive();
if (!active) {
  console.error("No active user query. Create one via POST /api/v1/user-query first.");
  process.exit(1);
}
const serviceProvider = new ServiceProvider(env, db);

const provider = EmailProvider.Gmail;
const payload: TestEmailPayload = {
  provider,
  messageId: `direct-test-${Date.now()}@local`,
  sender: "test@example.com",
  subject: "Test invoice request",
  rawContent:
    "Hi, I am John Doe. I have a billing issue with invoice #INV-1001. Priority: high. Please help.",
  receivedAt: new Date().toISOString(),
  attachments: [],
};

try {
  const emailId = await emailRepo.savePendingEmail({
    provider: payload.provider,
    messageId: payload.messageId,
    sender: payload.sender,
    subject: payload.subject,
    rawContent: payload.rawContent,
    attachmentCount: 0,
    receivedAt: new Date(payload.receivedAt),
    userQueryId: active.id,
    userQuerySchema: wrapOutputSchema(active.outputSchema),
  });

  await attachmentRepo.saveAttachments(emailId, []);
  const result = await serviceProvider.emailProcessing.process({
    data: { emailUuid: emailId },
    attemptsMade: 0,
  });
  if (!result.success) {
    console.error("FAILED:", result.message);
    process.exit(1);
  }
  console.log("SUCCESS: processed email");
} catch (e) {
  console.error("FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
}

process.exit(0);
