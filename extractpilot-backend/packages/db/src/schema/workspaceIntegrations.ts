import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const workspaceIntegrations = pgTable("workspace_integrations", {
  ownerUserId: uuid("owner_user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  webhookUrl: text("webhook_url"),
  slackWebhookUrl: text("slack_webhook_url"),
  notifyOnExtractionCompleted: boolean("notify_on_extraction_completed").default(true).notNull(),
  notifyOnFailure: boolean("notify_on_failure").default(true).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
