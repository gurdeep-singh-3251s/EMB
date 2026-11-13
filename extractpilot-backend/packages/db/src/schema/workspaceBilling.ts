import { pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

/** Per-user billing (Stripe subscription → active plan). `id` = users.id (UUID string). */
export const workspaceBilling = pgTable("workspace_billing", {
  id: varchar("id", { length: 36 }).primaryKey(),
  planId: varchar("plan_id", { length: 32 }).notNull().default("free"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  subscriptionStatus: varchar("subscription_status", { length: 32 }).notNull().default("none"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
