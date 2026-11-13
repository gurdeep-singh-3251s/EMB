import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

export const promptEnhancements = pgTable("prompt_enhancements", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sourceDraft: text("source_draft").notNull(),
  enhanced: text("enhanced").notNull(),
  rationale: text("rationale"),
  model: varchar("model", { length: 128 }).notNull(),
  goal: text("goal"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
