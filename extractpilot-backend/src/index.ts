import { createDb } from "@repo/db";
import { createRedisConnection, ExtractionProgressPublisher } from "@repo/feature-queue";
import { createAppContext } from "./bootstrap/factory";
import { loadEnv } from "@repo/config";
import { createEmailProcessingQueue } from "./gurdeep-cron/email-provider/provider/emailQueueProvider";
import ServiceProvider from "./gurdeep-cron/ServiceProvider";
import WorkerServiceProvider from "./worker/serviceProvider";
import { startEmailProcessingWorker } from "./worker/worker";
import { ApiServer } from "./server";
import startGurdeepCronFetchEmails from "./gurdeep-cron/cron";
import { startAttachmentCleanupCron } from "./jobs/attachmentCleanup";

const env = loadEnv();
const ctx = createAppContext(env);

const redis = createRedisConnection(env.redisUrl);
const queue = createEmailProcessingQueue(redis);
const progressPublisher = new ExtractionProgressPublisher(redis);
const emailService = new ServiceProvider(env, queue, progressPublisher);

const workerDb = createDb(env.databaseUrl);
const workerServiceProvider = new WorkerServiceProvider(env, workerDb);
startEmailProcessingWorker(env, workerServiceProvider);

const app = new ApiServer(env, () => ctx, {
  rest: { getEmailService: () => emailService.emails },
  redis,
});
app.start();

if (env.enableCron) {
  startGurdeepCronFetchEmails(env, emailService);
} else {
  console.log("[cron] Disabled — set ENABLE_CRON=true to enable IMAP fetch");
}

startAttachmentCleanupCron(env, ctx.db);
