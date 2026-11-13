import { eq } from "drizzle-orm";
import type { Database } from "@repo/db";
import { users, workspaceBilling } from "@repo/db/schema";
import type { AuthUser } from "./jwt";

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
