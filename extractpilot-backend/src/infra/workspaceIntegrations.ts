import type { Database } from "@repo/db";
import { emails, workspaceAuditLog, workspaceIntegrations, users } from "@repo/db/schema";
import { desc, eq } from "drizzle-orm";
import { ProcessingStatus } from "@repo/types/email";

export type WorkspaceIntegrationsRow = {
  webhookUrl: string | null;
  slackWebhookUrl: string | null;
  notifyOnExtractionCompleted: boolean;
  notifyOnFailure: boolean;
};

export async function getWorkspaceIntegrations(
  db: Database,
  ownerUserId: string,
): Promise<WorkspaceIntegrationsRow> {
  const [row] = await db
    .select()
    .from(workspaceIntegrations)
    .where(eq(workspaceIntegrations.ownerUserId, ownerUserId))
    .limit(1);
  return {
    webhookUrl: row?.webhookUrl ?? null,
    slackWebhookUrl: row?.slackWebhookUrl ?? null,
    notifyOnExtractionCompleted: row?.notifyOnExtractionCompleted ?? true,
    notifyOnFailure: row?.notifyOnFailure ?? true,
  };
}

export async function upsertWorkspaceIntegrations(
  db: Database,
  ownerUserId: string,
  patch: Partial<WorkspaceIntegrationsRow>,
): Promise<WorkspaceIntegrationsRow> {
  const current = await getWorkspaceIntegrations(db, ownerUserId);
  const next: WorkspaceIntegrationsRow = {
    webhookUrl: patch.webhookUrl !== undefined ? patch.webhookUrl : current.webhookUrl,
    slackWebhookUrl: patch.slackWebhookUrl !== undefined ? patch.slackWebhookUrl : current.slackWebhookUrl,
    notifyOnExtractionCompleted:
      patch.notifyOnExtractionCompleted !== undefined
        ? patch.notifyOnExtractionCompleted
        : current.notifyOnExtractionCompleted,
    notifyOnFailure: patch.notifyOnFailure !== undefined ? patch.notifyOnFailure : current.notifyOnFailure,
  };

  await db
    .insert(workspaceIntegrations)
    .values({
      ownerUserId,
      webhookUrl: next.webhookUrl,
      slackWebhookUrl: next.slackWebhookUrl,
      notifyOnExtractionCompleted: next.notifyOnExtractionCompleted,
      notifyOnFailure: next.notifyOnFailure,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: workspaceIntegrations.ownerUserId,
      set: {
        webhookUrl: next.webhookUrl,
        slackWebhookUrl: next.slackWebhookUrl,
        notifyOnExtractionCompleted: next.notifyOnExtractionCompleted,
        notifyOnFailure: next.notifyOnFailure,
        updatedAt: new Date(),
      },
    });

  return next;
}

export async function recordWorkspaceAudit(
  db: Database,
  ownerUserId: string,
  action: string,
  detail?: Record<string, unknown> | null,
): Promise<void> {
  await db.insert(workspaceAuditLog).values({
    ownerUserId,
    action,
    detail: detail ?? null,
  });
}

type ExtractionEvent = "extraction.completed" | "extraction.failed";

async function postJson(url: string, body: unknown, label: string): Promise<void> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      console.warn(`[integrations] ${label} responded ${res.status}`);
    }
  } catch (e) {
    console.warn(`[integrations] ${label} failed`, e);
  }
}

/** Fire-and-forget customer webhooks after worker persists an email. */
export function dispatchExtractionEvent(
  db: Database,
  emailId: string,
  event: ExtractionEvent,
  status: ProcessingStatus,
): void {
  void (async () => {
    const [emailRow] = await db
      .select({
        id: emails.id,
        ownerUserId: emails.ownerUserId,
        subject: emails.subject,
        processingStatus: emails.processingStatus,
      })
      .from(emails)
      .where(eq(emails.id, emailId))
      .limit(1);

    const ownerUserId = emailRow?.ownerUserId;
    if (!ownerUserId) return;

    const settings = await getWorkspaceIntegrations(db, ownerUserId);
    if (event === "extraction.completed" && !settings.notifyOnExtractionCompleted) return;
    if (event === "extraction.failed" && !settings.notifyOnFailure) return;

    const payload = {
      event,
      emailId,
      status,
      subject: emailRow?.subject ?? null,
      at: new Date().toISOString(),
    };

    if (settings.webhookUrl?.trim()) {
      await postJson(settings.webhookUrl.trim(), payload, "customer webhook");
    }

    if (settings.slackWebhookUrl?.trim()) {
      const text = `ExtractPilot · ${event}\n${emailRow?.subject ?? emailId}\nStatus: ${status}`;
      await postJson(settings.slackWebhookUrl.trim(), { text }, "Slack webhook");
    }
  })();
}

export async function listWorkspaceAudit(
  db: Database,
  ownerUserId: string,
  limit: number,
): Promise<Array<{ id: string; action: string; detail: unknown; createdAt: Date }>> {
  return db
    .select({
      id: workspaceAuditLog.id,
      action: workspaceAuditLog.action,
      detail: workspaceAuditLog.detail,
      createdAt: workspaceAuditLog.createdAt,
    })
    .from(workspaceAuditLog)
    .where(eq(workspaceAuditLog.ownerUserId, ownerUserId))
    .orderBy(desc(workspaceAuditLog.createdAt))
    .limit(limit);
}

export async function getWorkspaceMemberSummary(
  db: Database,
  ownerUserId: string,
): Promise<{ id: string; email: string | null; name: string | null } | null> {
  const [row] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, ownerUserId))
    .limit(1);
  return row ?? null;
}
