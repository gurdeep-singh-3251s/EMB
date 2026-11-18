import { eq } from "drizzle-orm";
import type { Database } from "@repo/db";
import { users, workspaceBilling } from "@repo/db/schema";
import type { AuthUser } from "./jwt";
import { hashPassword, verifyPassword } from "./password";

export type GoogleProfile = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

export async function upsertGoogleUser(db: Database, profile: GoogleProfile): Promise<AuthUser> {
  const now = new Date();
  const [existing] = await db.select().from(users).where(eq(users.googleId, profile.sub)).limit(1);

  if (existing) {
    const [updated] = await db
      .update(users)
      .set({
        email: profile.email,
        name: profile.name ?? existing.name,
        picture: profile.picture ?? existing.picture,
        lastLoginAt: now,
      })
      .where(eq(users.id, existing.id))
      .returning();
    await ensureUserBillingRow(db, updated.id);
    return mapUser(updated);
  }

  const [byEmail] = await db.select().from(users).where(eq(users.email, profile.email)).limit(1);
  if (byEmail) {
    const [updated] = await db
      .update(users)
      .set({
        googleId: profile.sub,
        name: profile.name ?? byEmail.name,
        picture: profile.picture ?? byEmail.picture,
        lastLoginAt: now,
      })
      .where(eq(users.id, byEmail.id))
      .returning();
    await ensureUserBillingRow(db, updated.id);
    return mapUser(updated);
  }

  const [created] = await db
    .insert(users)
    .values({
      email: profile.email,
      name: profile.name ?? null,
      picture: profile.picture ?? null,
      googleId: profile.sub,
      lastLoginAt: now,
    })
    .returning();
  await ensureUserBillingRow(db, created.id);
  return mapUser(created);
}

async function ensureUserBillingRow(db: Database, userId: string): Promise<void> {
  const [row] = await db.select().from(workspaceBilling).where(eq(workspaceBilling.id, userId)).limit(1);
  if (row) return;
  await db.insert(workspaceBilling).values({
    id: userId,
    planId: "free",
    subscriptionStatus: "none",
  });
}

export async function registerPasswordUser(
  db: Database,
  input: { email: string; password: string; name: string | null },
): Promise<{ ok: true; user: AuthUser } | { ok: false; message: string }> {
  const [existing] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (existing?.passwordHash) {
    return { ok: false, message: "An account with this email already exists. Sign in instead." };
  }
  if (existing?.googleId && !existing.passwordHash) {
    return { ok: false, message: "This email uses Google sign-in. Continue with Google." };
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  const [created] = await db
    .insert(users)
    .values({
      email: input.email,
      name: input.name,
      passwordHash,
      lastLoginAt: now,
    })
    .returning();
  await ensureUserBillingRow(db, created.id);
  return { ok: true, user: mapUser(created) };
}

export async function authenticatePasswordUser(
  db: Database,
  input: { email: string; password: string },
): Promise<{ ok: true; user: AuthUser } | { ok: false; message: string }> {
  const [existing] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (!existing) {
    return { ok: false, message: "Invalid email or password." };
  }
  if (!existing.passwordHash) {
    return { ok: false, message: "This email uses Google sign-in. Continue with Google." };
  }
  const matches = await verifyPassword(input.password, existing.passwordHash);
  if (!matches) {
    return { ok: false, message: "Invalid email or password." };
  }
  const now = new Date();
  await db.update(users).set({ lastLoginAt: now }).where(eq(users.id, existing.id));
  return { ok: true, user: mapUser(existing) };
}

export async function findUserById(db: Database, id: string): Promise<AuthUser | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ? mapUser(row) : null;
}

function mapUser(row: typeof users.$inferSelect): AuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    picture: row.picture,
  };
}
