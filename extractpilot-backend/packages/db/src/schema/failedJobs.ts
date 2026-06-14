import { pgTable } from "drizzle-orm/pg-core/table";
import { integer, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { emails } from "./emails";

export const failedJobs = pgTable("failed_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  emailId: uuid("email_id").references(() => emails.id, { onDelete: "set null" }),
  errorMessage: text("error_message").notNull(),
  retryCount: integer("retry_count").default(0).notNull(),
  failedAt: timestamp("failed_at", { withTimezone: true }).defaultNow().notNull(),
});
