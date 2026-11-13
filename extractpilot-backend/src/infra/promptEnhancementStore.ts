import { desc, eq } from "drizzle-orm";
import type { Database } from "@repo/db";
import { promptEnhancements } from "@repo/db/schema";

export type PromptEnhancementRow = {
  id: string;
  sourceDraft: string;
  enhanced: string;
  rationale: string | null;
  model: string;
  goal: string | null;
  createdAt: Date;
};

export async function savePromptEnhancement(
  db: Database,
  input: {
    ownerUserId: string;
    sourceDraft: string;
    enhanced: string;
    rationale?: string | null;
    model: string;
    goal?: string | null;
  },
): Promise<PromptEnhancementRow> {
  const [row] = await db
    .insert(promptEnhancements)
    .values({
      ownerUserId: input.ownerUserId,
      sourceDraft: input.sourceDraft,
      enhanced: input.enhanced,
      rationale: input.rationale ?? null,
      model: input.model,
      goal: input.goal ?? null,
    })
    .returning();
  return mapRow(row!);
}

export async function listPromptEnhancements(
  db: Database,
  ownerUserId: string,
  limit: number,
): Promise<PromptEnhancementRow[]> {
  const rows = await db
    .select()
    .from(promptEnhancements)
    .where(eq(promptEnhancements.ownerUserId, ownerUserId))
    .orderBy(desc(promptEnhancements.createdAt))
    .limit(limit);
  return rows.map(mapRow);
}

function mapRow(row: typeof promptEnhancements.$inferSelect): PromptEnhancementRow {
  return {
    id: row.id,
    sourceDraft: row.sourceDraft,
    enhanced: row.enhanced,
    rationale: row.rationale,
    model: row.model,
    goal: row.goal,
    createdAt: row.createdAt,
  };
}
