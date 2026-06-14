import { pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

/** Single-row workspace billing state (Stripe subscription → active plan). */
export const workspaceBilling = pgTable("workspace_billing", {
  id: varchar("id", { length: 32 }).primaryKey().default("default"),
  planId: varchar("plan_id", { length: 32 }).notNull().default("free"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  subscriptionStatus: varchar("subscription_status", { length: 32 }).notNull().default("none"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
