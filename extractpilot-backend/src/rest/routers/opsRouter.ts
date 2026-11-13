import { and, count, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";
import type { RestHandlerDeps } from "@repo/types/restTypes";
import { emails, failedJobs } from "@repo/db/schema";
import { EMAIL_DLQ_JOB, EMAIL_PROCESSING_DLQ, EMAIL_PROCESSING_QUEUE } from "@repo/feature-queue";
import { Queue, type ConnectionOptions } from "bullmq";
import type { Redis } from "ioredis";
import { BaseRestController } from "../helper/init";
import { getRequestTenantUserId } from "../requestContext";
import { createEmailProcessingQueue, enqueueEmailJob } from "../../gurdeep-cron/email-provider/provider/emailQueueProvider";
import type { DeadLetterPayload } from "@repo/feature-queue";
import { ProcessingStatus } from "@repo/types/email";
import { recordWorkspaceAudit } from "../../infra/workspaceIntegrations";

class OpsHandler extends BaseRestController {
  async workspaceHealth(): Promise<Response> {
    const userId = getRequestTenantUserId();
    if (!userId) {
      return Response.json({ success: false, message: "Sign in required", error: null }, { status: 401 });
    }

    const db = this.deps.getDb();
    const [failedRow] = await db
      .select({ total: count() })
      .from(failedJobs)
      .innerJoin(emails, eq(failedJobs.emailId, emails.id))
      .where(eq(emails.ownerUserId, userId));

    const [processingRow] = await db
      .select({ total: count() })
      .from(emails)
      .where(and(eq(emails.ownerUserId, userId), eq(emails.processingStatus, "processing")));

    let queue: Record<string, number> | null = null;
    const redis = this.deps.getRedis();
    if (redis) {
      const connection = redis as ConnectionOptions;
      const main = new Queue(EMAIL_PROCESSING_QUEUE, { connection });
      const dlq = new Queue(EMAIL_PROCESSING_DLQ, { connection });
      const [waiting, active, failed, dlqWaiting] = await Promise.all([
        main.getWaitingCount(),
        main.getActiveCount(),
        main.getFailedCount(),
        dlq.getWaitingCount(),
      ]);
      queue = { waiting, active, failed, dlqWaiting };
      await main.close();
      await dlq.close();
    }

    return this.success(
      {
        failedExtractions: Number(failedRow?.total ?? 0),
        emailsProcessing: Number(processingRow?.total ?? 0),
        queue,
        cronEnabled: this.deps.env.enableCron,
        attachmentMode: this.deps.env.attachmentMode,
        ocrConfigured: Boolean(this.deps.env.paddleOcr.apiUrl?.trim()),
      },
      null,
      200,
    );
  }

  async listFailures(url: URL): Promise<Response> {
    const userId = getRequestTenantUserId();
    if (!userId) {
      return Response.json({ success: false, message: "Sign in required", error: null }, { status: 401 });
    }
    const limit = Math.min(50, Number(url.searchParams.get("limit") ?? "20") || 20);
    const rows = await this.deps
      .getDb()
      .select({
        id: failedJobs.id,
        emailId: failedJobs.emailId,
        errorMessage: failedJobs.errorMessage,
        retryCount: failedJobs.retryCount,
        failedAt: failedJobs.failedAt,
        subject: emails.subject,
      })
      .from(failedJobs)
      .innerJoin(emails, eq(failedJobs.emailId, emails.id))
      .where(eq(emails.ownerUserId, userId))
      .orderBy(desc(failedJobs.failedAt))
      .limit(limit);

    return this.success({ items: rows }, null, 200);
  }

  async retryFailure(req: Request): Promise<Response> {
    const userId = getRequestTenantUserId();
    if (!userId) {
      return Response.json({ success: false, message: "Sign in required", error: null }, { status: 401 });
    }
    const parsed = z
      .object({
        emailId: z.string().uuid().optional(),
        failedJobId: z.string().uuid().optional(),
      })
      .refine((b) => b.emailId || b.failedJobId, { message: "Provide emailId or failedJobId" })
      .safeParse(await this.readJson(req));
    if (!parsed.success) {
      return this.validationError(parsed.error.message, parsed.error.flatten());
    }

    const db = this.deps.getDb();
    let emailId = parsed.data.emailId;
    if (!emailId && parsed.data.failedJobId) {
      const [fj] = await db
        .select({ emailId: failedJobs.emailId })
        .from(failedJobs)
        .innerJoin(emails, eq(failedJobs.emailId, emails.id))
        .where(and(eq(failedJobs.id, parsed.data.failedJobId), eq(emails.ownerUserId, userId)))
        .limit(1);
      emailId = fj?.emailId ?? undefined;
    }
    if (!emailId) {
      return this.notFound("Failure not found for your workspace");
    }

    const maxRequeues = this.deps.env.maxFailedEmailRequeues;
    if (maxRequeues <= 0) {
      return this.validationError("Manual retries are disabled on this server", null);
    }

    const [updated] = await db
      .update(emails)
      .set({
        processingStatus: ProcessingStatus.Pending,
        parsedJson: null,
        classificationResult: null,
        processingStartedAt: null,
        processingCompletedAt: null,
        enqueueAt: null,
        failedRequeueCount: sql`${emails.failedRequeueCount} + 1`,
      })
      .where(
        and(
          eq(emails.id, emailId),
          eq(emails.ownerUserId, userId),
          eq(emails.processingStatus, ProcessingStatus.Failed),
          lt(emails.failedRequeueCount, maxRequeues),
        ),
      )
      .returning({ id: emails.id });

    if (!updated) {
      return this.validationError("Email is not eligible for retry (not failed or requeue limit reached)", null);
    }

    const redis = this.deps.getRedis();
    if (!redis) {
      return this.validationError("Queue unavailable — configure REDIS_URL", null);
    }
    await enqueueEmailJob(createEmailProcessingQueue(redis as Redis), { emailUuid: emailId });
    await recordWorkspaceAudit(db, userId, "ops.retry_failure", { emailId });
    return this.success({ emailId, requeued: true }, "Requeued for extraction", 200);
  }

  async replayDlq(req: Request): Promise<Response> {
    const userId = getRequestTenantUserId();
    if (!userId) {
      return Response.json({ success: false, message: "Sign in required", error: null }, { status: 401 });
    }
    const parsed = z.object({ limit: z.number().int().min(1).max(25).optional() }).safeParse(await this.readJson(req));
    const limit = parsed.success ? (parsed.data.limit ?? 10) : 10;

    const redis = this.deps.getRedis();
    if (!redis) {
      return this.validationError("Queue unavailable — configure REDIS_URL", null);
    }

    const connection = redis as ConnectionOptions;
    const dlq = new Queue<DeadLetterPayload>(EMAIL_PROCESSING_DLQ, { connection });
    const main = createEmailProcessingQueue(redis as Redis);
    const db = this.deps.getDb();

    try {
      const jobs = await dlq.getJobs(["waiting", "delayed"], 0, limit - 1);
      let replayed = 0;

      for (const job of jobs) {
        if (job.name !== EMAIL_DLQ_JOB) continue;
        const emailUuid = job.data?.emailUuid;
        if (!emailUuid) continue;

        const [row] = await db
          .select({ id: emails.id })
          .from(emails)
          .where(and(eq(emails.id, emailUuid), eq(emails.ownerUserId, userId)))
          .limit(1);
        if (!row) continue;

        await enqueueEmailJob(main, { emailUuid });
        await job.remove();
        replayed += 1;
      }

      await recordWorkspaceAudit(db, userId, "ops.replay_dlq", { replayed, scanned: jobs.length });
      return this.success({ replayed, scanned: jobs.length }, replayed ? "DLQ jobs requeued" : "No DLQ jobs for your workspace", 200);
    } finally {
      await dlq.close();
      await main.close();
    }
  }

  async retryAllFailures(): Promise<Response> {
    const userId = getRequestTenantUserId();
    if (!userId) {
      return Response.json({ success: false, message: "Sign in required", error: null }, { status: 401 });
    }
    const db = this.deps.getDb();
    const maxRequeues = this.deps.env.maxFailedEmailRequeues;
    if (maxRequeues <= 0) {
      return this.validationError("Manual retries are disabled on this server", null);
    }

    const failedRows = await db
      .select({ id: emails.id })
      .from(emails)
      .where(
        and(
          eq(emails.ownerUserId, userId),
          eq(emails.processingStatus, ProcessingStatus.Failed),
          lt(emails.failedRequeueCount, maxRequeues),
        ),
      )
      .orderBy(desc(emails.createdAt))
      .limit(25);

    const ids = failedRows.map((r) => r.id);
    if (ids.length === 0) {
      return this.success({ requeued: 0 }, "No failed emails to retry", 200);
    }

    await db
      .update(emails)
      .set({
        processingStatus: ProcessingStatus.Pending,
        parsedJson: null,
        classificationResult: null,
        processingStartedAt: null,
        processingCompletedAt: null,
        enqueueAt: null,
        failedRequeueCount: sql`${emails.failedRequeueCount} + 1`,
      })
      .where(
        and(
          inArray(emails.id, ids),
          eq(emails.ownerUserId, userId),
          eq(emails.processingStatus, ProcessingStatus.Failed),
        ),
      );

    const redis = this.deps.getRedis();
    if (!redis) {
      return this.validationError("Queue unavailable — configure REDIS_URL", null);
    }
    const queue = createEmailProcessingQueue(redis as Redis);
    for (const emailUuid of ids) {
      await enqueueEmailJob(queue, { emailUuid });
    }
    await queue.close();
    await recordWorkspaceAudit(db, userId, "ops.retry_all_failures", { count: ids.length });
    return this.success({ requeued: ids.length }, "Failed emails requeued", 200);
  }
}

export async function handleOpsRouter(req: Request, deps: RestHandlerDeps): Promise<Response | null> {
  const path = new URL(req.url).pathname;
  const handler = new OpsHandler(deps);

  if (path === "/api/v1/ops/health" && req.method === "GET") {
    return handler.workspaceHealth();
  }
  if (path === "/api/v1/ops/failures" && req.method === "GET") {
    return handler.listFailures(new URL(req.url));
  }
  if (path === "/api/v1/ops/retry-failure" && req.method === "POST") {
    return handler.retryFailure(req);
  }
  if (path === "/api/v1/ops/replay-dlq" && req.method === "POST") {
    return handler.replayDlq(req);
  }
  if (path === "/api/v1/ops/retry-all-failures" && req.method === "POST") {
    return handler.retryAllFailures();
  }
  return null;
}
