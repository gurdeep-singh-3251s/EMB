import { Queue, type ConnectionOptions } from "bullmq";
import type { Redis } from "ioredis";
import { EMAIL_DLQ_JOB, EMAIL_PROCESSING_DLQ } from "./constants";
import type { EmailProcessingJob } from "@repo/types/email";

export type DeadLetterPayload = EmailProcessingJob & {
  originalJobId?: string;
  errorMessage: string;
  attemptsMade: number;
  failedAt: string;
};

export function createDeadLetterQueue(connection: Redis): Queue<DeadLetterPayload> {
  return new Queue<DeadLetterPayload>(EMAIL_PROCESSING_DLQ, {
    connection: connection as ConnectionOptions,
    defaultJobOptions: {
      removeOnComplete: { count: 10_000 },
      removeOnFail: { count: 2_000 },
    },
  });
}

export async function moveJobToDeadLetter(
  dlq: Queue<DeadLetterPayload>,
  input: {
    jobId?: string;
    data: EmailProcessingJob;
    errorMessage: string;
    attemptsMade: number;
  },
): Promise<void> {
  await dlq.add(
    EMAIL_DLQ_JOB,
    {
      ...input.data,
      originalJobId: input.jobId,
      errorMessage: input.errorMessage.slice(0, 4000),
      attemptsMade: input.attemptsMade,
      failedAt: new Date().toISOString(),
    },
    {
      jobId: input.jobId ? `dlq__${input.jobId}` : undefined,
    },
  );
}
