import { boolean, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

/** Per-user IMAP accounts (multi-mailbox SaaS). Passwords stored encrypted at rest. */
export const userMailboxes = pgTable("user_mailboxes", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 128 }).notNull().default("Primary"),
  provider: varchar("provider", { length: 32 }).notNull(),
  providerPreset: varchar("provider_preset", { length: 64 }),
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull().default(993),
  imapUser: varchar("imap_user", { length: 320 }).notNull(),
  passwordEncrypted: text("password_encrypted").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
