import { Worker, type ConnectionOptions } from "bullmq";
import type { Env } from "@repo/config";
import { EMAIL_PROCESSING_QUEUE, createRedisConnection } from "@repo/feature-queue";
import type { EmailProcessingJob } from "@repo/types/email";
import type ServiceProvider from "./serviceProvider";

/** BullMQ and @repo/feature-queue may resolve different ioredis typings; runtime value is compatible. */
function bullMqConnection(redisUrl: string): ConnectionOptions {
  return createRedisConnection(redisUrl) as ConnectionOptions;
}

export function startEmailProcessingWorker(env: Env, serviceProvider: ServiceProvider): Worker<EmailProcessingJob> {
  const connection: ConnectionOptions = bullMqConnection(env.redisUrl);

  const worker = new Worker<EmailProcessingJob>(
    EMAIL_PROCESSING_QUEUE,
    async (job) => {
      const result = await serviceProvider.emailProcessing.process({
        data: job.data,
        attemptsMade: job.attemptsMade,
      });
      if (!result.success) {
        throw new Error(result.message);
      }
    },
    {
      connection,
      concurrency: env.workerConcurrency,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.id} failed`, err.message);
  });

  console.log(`[worker] Started (concurrency=${env.workerConcurrency})`);
  return worker;
}
