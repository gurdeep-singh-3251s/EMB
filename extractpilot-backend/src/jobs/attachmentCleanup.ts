import { CronJob } from "cron";
import { eq, lt } from "drizzle-orm";
import { unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { Database } from "@repo/db";
import { emailAttachments } from "@repo/db/schema";
import type { Env } from "@repo/config";
import { resolveAttachmentLocalPath } from "@repo/config/paths";

export async function cleanupExpiredAttachments(env: Env, db: Database): Promise<number> {
  const days = env.attachmentRetentionDays;
  if (days <= 0) return 0;

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      id: emailAttachments.id,
      localPath: emailAttachments.localPath,
    })
    .from(emailAttachments)
    .where(lt(emailAttachments.createdAt, cutoff))
    .limit(500);

  let removed = 0;
  for (const row of rows) {
    const filePath = resolveAttachmentLocalPath(row.localPath, env.attachmentsRoot);
    if (existsSync(filePath)) {
      try {
        await unlink(filePath);
        removed++;
      } catch (err) {
        console.warn(`[attachment-cleanup] Failed to delete ${filePath}`, err);
      }
    }
    await db.delete(emailAttachments).where(eq(emailAttachments.id, row.id));
  }

  return removed;
}

export function startAttachmentCleanupCron(env: Env, db: Database): void {
  if (env.attachmentRetentionDays <= 0) {
    console.log("[attachment-cleanup] Disabled — set ATTACHMENT_RETENTION_DAYS > 0 to enable");
    return;
  }

  const job = new CronJob("0 3 * * *", async () => {
    try {
      const removed = await cleanupExpiredAttachments(env, db);
      console.log(`[attachment-cleanup] Removed ${removed} expired attachment file(s)`);
    } catch (err) {
      console.error("[attachment-cleanup] Failed", err);
    }
  });

  job.start();
  console.log(`[attachment-cleanup] Scheduled daily — retention ${env.attachmentRetentionDays} day(s)`);
}
