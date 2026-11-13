import { Queue, type ConnectionOptions, type JobsOptions } from "bullmq";
import type { Redis } from "ioredis";
import { loadEnv } from "@repo/config";
import { EMAIL_PROCESSING_JOB, EMAIL_PROCESSING_QUEUE } from "@repo/feature-queue";
import type { EmailProcessingJob } from "@repo/types/email";
import { createHash } from "node:crypto";
import { DTO } from "@repo/dto";

function defaultJobOptions(): JobsOptions {
  const env = loadEnv();
  return {
    attempts: env.queue.jobAttempts,
    backoff: { type: "exponential", delay: env.queue.backoffMs },
    removeOnComplete: { count: env.queue.removeOnCompleteCount },
    removeOnFail: { count: env.queue.removeOnFailCount },
  };
}

export function stableJobId(payload: EmailProcessingJob): string {
  const raw = payload.emailUuid;
  const hash = createHash("sha1").update(raw).digest("hex").slice(0, 16);
  return `email__${hash}`;
}

export function createEmailProcessingQueue(connection: Redis): Queue<EmailProcessingJob> {
  return new Queue<EmailProcessingJob>(EMAIL_PROCESSING_QUEUE, {
    connection: connection as ConnectionOptions,
    defaultJobOptions: defaultJobOptions(),
  });
}

async function removeStaleJob(queue: Queue<EmailProcessingJob>, jobId: string): Promise<void> {
  const existing = await queue.getJob(jobId);
  if (!existing) return;
  const state = await existing.getState();
  if (state === "active") return;
  if (state === "failed" || state === "completed" || state === "waiting" || state === "delayed") {
    await existing.remove();
  }
}

export async function enqueueEmailJob(
  queue: Queue<EmailProcessingJob>,
  payload: EmailProcessingJob,
): Promise<void> {
  const jobId = stableJobId(payload);
  await removeStaleJob(queue, jobId);
  await queue.add(EMAIL_PROCESSING_JOB, payload, {
    // Idempotency: avoid re-processing same provider+messageId on repeated cron runs.
    // BullMQ/Redis keys are happier with a short safe id (no <>/: etc).
    jobId,
    ...defaultJobOptions(),
  });
}

export async function enqueueEmailJobsBulk(
  queue: Queue<EmailProcessingJob>,
  payloads: EmailProcessingJob[],
): Promise<DTO<null>> {
  if (payloads.length === 0) return DTO.Success(null);
  for (const payload of payloads) {
    await removeStaleJob(queue, stableJobId(payload));
  }
  await queue.addBulk(
    payloads.map((payload) => ({
      name: EMAIL_PROCESSING_JOB,
      data: payload,
      opts: {
        jobId: stableJobId(payload),
        ...defaultJobOptions(),
      },
    })),
  );
  return DTO.Success(null);
}
