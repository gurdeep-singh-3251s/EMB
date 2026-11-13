import { Worker, type ConnectionOptions } from "bullmq";
import type { Env } from "@repo/config";
import {
  EMAIL_PROCESSING_QUEUE,
  createDeadLetterQueue,
  createRedisConnection,
  moveJobToDeadLetter,
} from "@repo/feature-queue";
import type { EmailProcessingJob } from "@repo/types/email";
import type { Redis } from "ioredis";
import type ServiceProvider from "./serviceProvider";

/** BullMQ and @repo/feature-queue may resolve different ioredis typings; runtime value is compatible. */
function bullMqConnection(redisUrl: string): ConnectionOptions {
  return createRedisConnection(redisUrl) as ConnectionOptions;
}

export function startEmailProcessingWorker(env: Env, serviceProvider: ServiceProvider): Worker<EmailProcessingJob> {
  const connection: ConnectionOptions = bullMqConnection(env.redisUrl);
  const redis = createRedisConnection(env.redisUrl) as Redis;
  const deadLetterQueue = createDeadLetterQueue(redis);

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
      limiter: {
        max: env.workerLimiter.max,
        duration: env.workerLimiter.durationMs,
      },
    },
  );

  worker.on("completed", (job) => {
    console.log(`[worker] Job ${job.id} completed`);
  });

  worker.on("failed", async (job, err) => {
    console.error(`[worker] Job ${job?.id} failed`, err.message);
    if (!job) return;

    const maxAttempts = job.opts.attempts ?? env.queue.jobAttempts;
    if (job.attemptsMade < maxAttempts) return;

    try {
      await moveJobToDeadLetter(deadLetterQueue, {
        jobId: job.id,
        data: job.data,
        errorMessage: err.message,
        attemptsMade: job.attemptsMade,
      });
      console.warn(`[worker] Job ${job.id} moved to dead-letter queue after ${job.attemptsMade} attempts`);
    } catch (dlqErr) {
      console.error("[worker] Failed to enqueue dead-letter job", dlqErr);
    }
  });

  console.log(
    `[worker] Started (concurrency=${env.workerConcurrency}, limiter=${env.workerLimiter.max}/${env.workerLimiter.durationMs}ms)`,
  );
  return worker;
}
