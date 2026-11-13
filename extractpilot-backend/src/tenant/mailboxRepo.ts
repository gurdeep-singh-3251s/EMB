import { and, desc, eq } from "drizzle-orm";
import type { Database } from "@repo/db";
import { userMailboxes } from "@repo/db/schema";
import type { Env } from "@repo/config";
import type { EmailProvider } from "@repo/types/email";
import type { ImapProviderPresetId } from "@repo/types/imapProviders";
import { decryptSecret, encryptSecret } from "../auth/secretBox";

export type MailboxRecord = {
  id: string;
  label: string;
  provider: EmailProvider;
  providerPreset: ImapProviderPresetId | null;
  host: string;
  port: number;
  imapUser: string;
  isActive: boolean;
};

export type MailboxCredentials = MailboxRecord & { password: string };

export async function listMailboxes(db: Database, ownerUserId: string): Promise<MailboxRecord[]> {
  const rows = await db
    .select()
    .from(userMailboxes)
    .where(eq(userMailboxes.ownerUserId, ownerUserId))
    .orderBy(desc(userMailboxes.isActive), desc(userMailboxes.updatedAt));

  return rows.map(mapRowPublic);
}

export async function getActiveMailboxCredentials(
  db: Database,
  env: Env,
  ownerUserId: string,
): Promise<MailboxCredentials | null> {
  const [row] = await db
    .select()
    .from(userMailboxes)
    .where(and(eq(userMailboxes.ownerUserId, ownerUserId), eq(userMailboxes.isActive, true)))
    .limit(1);

  if (!row) return null;
  const password = await decryptSecret(row.passwordEncrypted, env);
  return { ...mapRowPublic(row), password };
}

export async function upsertMailbox(
  db: Database,
  env: Env,
  ownerUserId: string,
  input: {
    id?: string;
    label?: string;
    provider: EmailProvider;
    providerPreset?: ImapProviderPresetId | null;
    host: string;
    port: number;
    imapUser: string;
    password: string;
    setActive?: boolean;
  },
): Promise<MailboxRecord> {
  const passwordEncrypted = await encryptSecret(input.password.replace(/\s/g, ""), env);
  const now = new Date();

  if (input.setActive !== false) {
    await db
      .update(userMailboxes)
      .set({ isActive: false, updatedAt: now })
      .where(eq(userMailboxes.ownerUserId, ownerUserId));
  }

  if (input.id) {
    const [updated] = await db
      .update(userMailboxes)
      .set({
        label: input.label ?? "Primary",
        provider: input.provider,
        providerPreset: input.providerPreset ?? null,
        host: input.host,
        port: input.port,
        imapUser: input.imapUser,
        passwordEncrypted,
        isActive: input.setActive !== false,
        updatedAt: now,
      })
      .where(and(eq(userMailboxes.id, input.id), eq(userMailboxes.ownerUserId, ownerUserId)))
      .returning();
    if (!updated) throw new Error("Mailbox not found");
    return mapRowPublic(updated);
  }

  const [created] = await db
    .insert(userMailboxes)
    .values({
      ownerUserId,
      label: input.label ?? "Primary",
      provider: input.provider,
      providerPreset: input.providerPreset ?? null,
      host: input.host,
      port: input.port,
      imapUser: input.imapUser,
      passwordEncrypted,
      isActive: input.setActive !== false,
      updatedAt: now,
    })
    .returning();

  return mapRowPublic(created!);
}

export async function activateMailbox(db: Database, ownerUserId: string, mailboxId: string): Promise<void> {
  const now = new Date();
  await db
    .update(userMailboxes)
    .set({ isActive: false, updatedAt: now })
    .where(eq(userMailboxes.ownerUserId, ownerUserId));
  await db
    .update(userMailboxes)
    .set({ isActive: true, updatedAt: now })
    .where(and(eq(userMailboxes.id, mailboxId), eq(userMailboxes.ownerUserId, ownerUserId)));
}

export async function deleteMailbox(db: Database, ownerUserId: string, mailboxId: string): Promise<boolean> {
  const result = await db
    .delete(userMailboxes)
    .where(and(eq(userMailboxes.id, mailboxId), eq(userMailboxes.ownerUserId, ownerUserId)));
  return (result as { rowCount?: number }).rowCount !== 0;
}

function mapRowPublic(row: typeof userMailboxes.$inferSelect): MailboxRecord {
  return {
    id: row.id,
    label: row.label,
    provider: row.provider as EmailProvider,
    providerPreset: (row.providerPreset as ImapProviderPresetId | null) ?? null,
    host: row.host,
    port: row.port,
    imapUser: row.imapUser,
    isActive: row.isActive,
  };
}
