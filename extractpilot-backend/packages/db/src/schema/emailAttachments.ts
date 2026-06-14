import { pgTable } from "drizzle-orm/pg-core/table";
import { jsonb, integer, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { uniqueIndex } from "drizzle-orm/pg-core";
import { emails } from "./emails";

export const emailAttachments = pgTable("email_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  emailId: uuid("email_id")
    .notNull()
    .references(() => emails.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 512 }).notNull(),
  mimeType: varchar("mime_type", { length: 128 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  localPath: text("local_path").notNull(),
  processingStatus: varchar("processing_status", { length: 32 }).notNull(),
  extractedText: text("extracted_text"),
  extractSource: varchar("extract_source", { length: 32 }),
  parsedJson: jsonb("parsed_json"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  // Prevent duplicates on repeated ingestion runs (same email, same stored file).
  uniqEmailLocalPath: uniqueIndex("email_attachments_email_id_local_path_uniq").on(t.emailId, t.localPath),
}));
