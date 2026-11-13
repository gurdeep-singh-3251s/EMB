import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { Database } from "@repo/db";
import { llmUsageEvents } from "@repo/db/schema";
import { estimateTokenCostUsd } from "@repo/config/llmModels";

export type LlmUsageRecord = {
  ownerUserId: string;
  model: string;
  step: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export async function recordLlmUsage(db: Database, record: LlmUsageRecord): Promise<void> {
  const estCostUsd = estimateTokenCostUsd(record.model, record.totalTokens);
  await db.insert(llmUsageEvents).values({
    ownerUserId: record.ownerUserId,
    model: record.model,
    step: record.step,
    promptTokens: record.promptTokens,
    completionTokens: record.completionTokens,
    totalTokens: record.totalTokens,
    estCostUsd: estCostUsd > 0 ? estCostUsd : null,
  });
}

export type ModelUsageRow = {
  model: string;
  calls: number;
  totalTokens: number;
  estCostUsd: number;
};

export async function aggregateLlmUsageByModel(
  db: Database,
  ownerUserId: string,
  sinceDays = 30,
): Promise<ModelUsageRow[]> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      model: llmUsageEvents.model,
      calls: sql<number>`count(*)::int`,
      totalTokens: sql<number>`coalesce(sum(${llmUsageEvents.totalTokens}), 0)::int`,
      estCostUsd: sql<number>`coalesce(sum(${llmUsageEvents.estCostUsd}), 0)::float`,
    })
    .from(llmUsageEvents)
    .where(and(eq(llmUsageEvents.ownerUserId, ownerUserId), gte(llmUsageEvents.createdAt, since)))
    .groupBy(llmUsageEvents.model)
    .orderBy(desc(sql`sum(${llmUsageEvents.totalTokens})`));

  return rows.map((r) => ({
    model: r.model,
    calls: Number(r.calls),
    totalTokens: Number(r.totalTokens),
    estCostUsd: Number(r.estCostUsd),
  }));
}
