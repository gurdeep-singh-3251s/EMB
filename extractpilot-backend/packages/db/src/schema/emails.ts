import {
  integer,
  jsonb,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core/table";
import { uniqueIndex } from "drizzle-orm/pg-core";
import { userQueries } from "./userQueries";

export const emails = pgTable(
  "emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: varchar("provider", { length: 32 }).notNull(),
    messageId: varchar("message_id", { length: 512 }).notNull(),
    sender: varchar("sender", { length: 512 }),
    subject: text("subject"),
    rawContent: text("raw_content"),
    /**
     * Optional per-email extraction schema (runtime JSON). The worker uses this to validate
     * the OpenRouter output for the email body.
     */
    userQueryId: uuid("user_query_id").references(() => userQueries.id, {
      onDelete: "set null",
    }),
    userQuerySchema: jsonb("user_query_schema"),
    classificationResult: jsonb("classification_result"),
    parsedJson: jsonb("parsed_json"),
    attachmentCount: integer("attachment_count").default(0).notNull(),
    failedRequeueCount: integer("failed_requeue_count").default(0).notNull(),
    processingStatus: varchar("processing_status", { length: 32 }).notNull(),
    /** When the message was received (from IMAP/internalDate). */
    receivedAt: timestamp("received_at", { withTimezone: true }),
    /** When the row was inserted (ingestion). */
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    /** When the email was added to the BullMQ queue. */
    enqueueAt: timestamp("enqueue_at", { withTimezone: true }),
    /** When worker began processing. */
    processingStartedAt: timestamp("processing_started_at", { withTimezone: true }),
    /** When worker finished (completed/failed/partial). */
    processingCompletedAt: timestamp("processing_completed_at", { withTimezone: true }),
  },
  (t) => ({
    providerMessageUnique: uniqueIndex("emails_provider_message_id_uq").on(t.provider, t.messageId),
  }),
);
