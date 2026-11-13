import { and, count, eq, gte } from "drizzle-orm";
import { emails, workspaceBilling } from "@repo/db/schema";
import { DEFAULT_PLAN_ID, PLANS, type PlanId } from "@repo/config/plans";
import type { Database } from "@repo/db";
import { aggregateLlmUsageByModel } from "../../infra/llmUsage";
import type { Env } from "@repo/config";

function startOfUtcDay(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function startOfUtcWeek(): Date {
  const d = new Date();
  const day = d.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - daysFromMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function quotaWindowStart(period: "day" | "week"): Date {
  return period === "day" ? startOfUtcDay() : startOfUtcWeek();
}

export function resolveActivePlanId(envPlan?: string): PlanId {
  if (envPlan === "standard" || envPlan === "premium" || envPlan === "enterprise" || envPlan === "free") {
    return envPlan;
  }
  return DEFAULT_PLAN_ID;
}

export async function getActivePlanId(db: Database, env: Env, userId?: string | null): Promise<PlanId> {
  if (userId) {
    try {
      const [row] = await db
        .select()
        .from(workspaceBilling)
        .where(eq(workspaceBilling.id, userId))
        .limit(1);

      if (row?.subscriptionStatus === "active") {
        const pid = row.planId;
        if (pid === "standard" || pid === "premium" || pid === "enterprise" || pid === "free") {
          return pid;
        }
      }
    } catch {
      // Table may not exist until first db:push
    }
    return "free";
  }

  return resolveActivePlanId(env.activePlan);
}

export async function upsertWorkspaceBilling(
  db: Database,
  userId: string,
  data: {
    planId: PlanId;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    subscriptionStatus: string;
  },
): Promise<void> {
  const [existing] = await db.select().from(workspaceBilling).where(eq(workspaceBilling.id, userId)).limit(1);

  if (existing) {
    await db
      .update(workspaceBilling)
      .set({
        planId: data.planId,
        stripeCustomerId: data.stripeCustomerId ?? existing.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId ?? existing.stripeSubscriptionId,
        subscriptionStatus: data.subscriptionStatus,
        updatedAt: new Date(),
      })
      .where(eq(workspaceBilling.id, userId));
    return;
  }

  await db.insert(workspaceBilling).values({
    id: userId,
    planId: data.planId,
    stripeCustomerId: data.stripeCustomerId ?? null,
    stripeSubscriptionId: data.stripeSubscriptionId ?? null,
    subscriptionStatus: data.subscriptionStatus,
  });
}

export async function getBillingRow(db: Database, userId: string) {
  const [row] = await db.select().from(workspaceBilling).where(eq(workspaceBilling.id, userId)).limit(1);
  return row ?? null;
}

function usageWhere(userId: string | null | undefined, since: Date) {
  const timeClause = gte(emails.createdAt, since);
  if (userId) {
    return and(eq(emails.ownerUserId, userId), timeClause);
  }
  return timeClause;
}

export async function checkExtractionAllowed(
  db: Database,
  planId: PlanId,
  options?: { unlimited?: boolean; userId?: string | null },
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (options?.unlimited) {
    return { ok: true };
  }

  const plan = PLANS[planId];
  const periodStart = quotaWindowStart(plan.limits.emailQuotaPeriod);
  const userId = options?.userId;

  const [periodRow] = await db
    .select({ total: count() })
    .from(emails)
    .where(usageWhere(userId, periodStart));

  const periodCount = Number(periodRow?.total ?? 0);
  const periodLabel = plan.limits.emailQuotaPeriod === "day" ? "day" : "week";
  if (periodCount >= plan.limits.emailsPerPeriod) {
    return {
      ok: false,
      message: `Plan limit reached: ${plan.limits.emailsPerPeriod} emails/${periodLabel} on ${plan.name}. Upgrade or wait for the quota to reset.`,
    };
  }

  const dayStart = startOfUtcDay();
  const [dayRow] = await db
    .select({ total: count() })
    .from(emails)
    .where(usageWhere(userId, dayStart));

  const dailyCount = Number(dayRow?.total ?? 0);
  if (dailyCount >= plan.limits.extractionsPerDay) {
    return {
      ok: false,
      message: `Daily extraction limit reached (${plan.limits.extractionsPerDay}/day on ${plan.name}). Try again tomorrow or upgrade.`,
    };
  }

  return { ok: true };
}

export async function getUsageSnapshot(
  db: Database,
  planId: PlanId,
  options?: { unlimited?: boolean; userId?: string | null },
) {
  const plan = PLANS[planId];
  const unlimited = options?.unlimited === true;
  const userId = options?.userId;
  const periodStart = quotaWindowStart(plan.limits.emailQuotaPeriod);
  const dayStart = startOfUtcDay();

  const [periodRow] = await db
    .select({ total: count() })
    .from(emails)
    .where(usageWhere(userId, periodStart));
  const [dayRow] = await db
    .select({ total: count() })
    .from(emails)
    .where(usageWhere(userId, dayStart));

  const llmByModel = userId ? await aggregateLlmUsageByModel(db, userId, 30) : [];
  const llmTokens30d = llmByModel.reduce((sum, row) => sum + row.totalTokens, 0);
  const llmEstCost30dUsd = llmByModel.reduce((sum, row) => sum + row.estCostUsd, 0);

  return {
    planId,
    planName: plan.name,
    emailsUsed: Number(periodRow?.total ?? 0),
    emailsLimit: unlimited ? null : plan.limits.emailsPerPeriod,
    emailQuotaPeriod: plan.limits.emailQuotaPeriod,
    extractionsToday: Number(dayRow?.total ?? 0),
    extractionsLimitDay: unlimited ? null : plan.limits.extractionsPerDay,
    unlimitedQuota: unlimited,
    llmByModel,
    llmTokens30d,
    llmEstCost30dUsd: Math.round(llmEstCost30dUsd * 10_000) / 10_000,
  };
}
