import { jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

export const userQueries = pgTable("user_queries", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }),
  userQuery: text("user_query").notNull(),
  outputSchema: jsonb("output_schema").notNull(),
  classifyModel: varchar("classify_model", { length: 128 }),
  extractModel: varchar("extract_model", { length: 128 }),
  status: varchar("status", { length: 32 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
