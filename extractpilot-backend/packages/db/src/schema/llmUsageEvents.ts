import { integer, pgTable, real, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

export const llmUsageEvents = pgTable("llm_usage_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  model: varchar("model", { length: 128 }).notNull(),
  step: varchar("step", { length: 64 }).notNull(),
  promptTokens: integer("prompt_tokens").default(0).notNull(),
  completionTokens: integer("completion_tokens").default(0).notNull(),
  totalTokens: integer("total_tokens").default(0).notNull(),
  estCostUsd: real("est_cost_usd"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
