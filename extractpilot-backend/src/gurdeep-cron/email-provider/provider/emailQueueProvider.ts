import { Queue, type ConnectionOptions } from "bullmq";
import type { Redis } from "ioredis";
import { EMAIL_PROCESSING_JOB, EMAIL_PROCESSING_QUEUE } from "@repo/feature-queue";
import type { EmailProcessingJob } from "@repo/types/email";
import { createHash } from "node:crypto";
import { DTO } from "@repo/dto";

export function stableJobId(payload: EmailProcessingJob): string {
  const raw = payload.emailUuid;
  const hash = createHash("sha1").update(raw).digest("hex").slice(0, 16);
  return `email__${hash}`;
}

export function createEmailProcessingQueue(connection: Redis): Queue<EmailProcessingJob> {
  return new Queue<EmailProcessingJob>(EMAIL_PROCESSING_QUEUE, {
    connection: connection as ConnectionOptions,
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
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: true,
    // Keep Redis clean; failures are already persisted to DB (failed_jobs table).
    removeOnFail: true,
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
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    })),
  );
  return DTO.Success(null);
}
