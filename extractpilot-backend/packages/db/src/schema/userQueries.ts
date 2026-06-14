import { jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const userQueries = pgTable("user_queries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userQuery: text("user_query").notNull(),
  outputSchema: jsonb("output_schema").notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
