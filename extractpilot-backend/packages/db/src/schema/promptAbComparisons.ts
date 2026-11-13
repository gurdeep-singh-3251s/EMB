import { jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { emails } from "./emails";
import { userQueries } from "./userQueries";
import { users } from "./users";

export const promptAbComparisons = pgTable("prompt_ab_comparisons", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  emailId: uuid("email_id")
    .notNull()
    .references(() => emails.id, { onDelete: "cascade" }),
  promptAId: uuid("prompt_a_id")
    .notNull()
    .references(() => userQueries.id, { onDelete: "cascade" }),
  promptBId: uuid("prompt_b_id")
    .notNull()
    .references(() => userQueries.id, { onDelete: "cascade" }),
  resultA: jsonb("result_a").notNull(),
  resultB: jsonb("result_b").notNull(),
  fieldDiffs: jsonb("field_diffs").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
