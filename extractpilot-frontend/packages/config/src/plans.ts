export type PlanId = "free" | "standard" | "premium" | "enterprise";

export type EmailQuotaPeriod = "day" | "week";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthlyUsd: number | null;
  limits: {
    emailsPerPeriod: number;
    emailQuotaPeriod: EmailQuotaPeriod;
    extractionsPerDay: number;
    maxSchemaFields: number;
    waitForResults: boolean;
    maxWaitTimeoutSeconds: number;
    requestsPerMinute: number;
  };
  stripePriceId?: string;
  features: string[];
  popular?: boolean;
};

/** Optional paid onboarding — Connect your workspace. */
export const SETUP_OFFER = {
  id: "setup-onboarding",
  name: "Connect your workspace",
  tagline:
    "White-glove session: connect Gmail / Outlook inboxes, define your extraction requirements, run a live extract, and hand off to your team.",
  priceUsd: 99.99,
  compareAtUsd: 499,
  badge: "Recommended for teams",
  savingsLabel: "Save $399",
  features: [
    "Connect multiple Gmail & IMAP mailboxes",
    "Requirements + schema configured with you",
    "Confidence scores explained for reviewers",
    "Live test extract on your real mailbox",
  ],
} as const;

export const PAID_PLAN_ORDER: PlanId[] = ["standard", "premium", "enterprise"];

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Basic",
    tagline: "Try the flow on one inbox — no card required",
    priceMonthlyUsd: 0,
    limits: {
      emailsPerPeriod: 50,
      emailQuotaPeriod: "week",
      extractionsPerDay: 10,
      maxSchemaFields: 10,
      waitForResults: true,
      maxWaitTimeoutSeconds: 60,
      requestsPerMinute: 30,
    },
    features: [
      "50 emails / week",
      "Manual extraction runs",
      "Current models, including Gemini",
      "One Gmail or IMAP mailbox",
      "Confidence scores",
    ],
  },
  standard: {
    id: "standard",
    name: "Standard",
    tagline: "Scheduled runs, summaries, and the tools you already use",
    priceMonthlyUsd: 24.99,
    popular: true,
    limits: {
      emailsPerPeriod: 1000,
      emailQuotaPeriod: "week",
      extractionsPerDay: 80,
      maxSchemaFields: 40,
      waitForResults: true,
      maxWaitTimeoutSeconds: 120,
      requestsPerMinute: 120,
    },
    features: [
      "1,000 emails / week",
      "Latest models — GPT and Claude",
      "Scheduled cron jobs",
      "Slack, webhooks, and summaries",
      "Multiple mailboxes",
      "Email support",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    tagline: "Frontier models, more tools, and higher volume",
    priceMonthlyUsd: 49.99,
    limits: {
      emailsPerPeriod: 5000,
      emailQuotaPeriod: "week",
      extractionsPerDay: 300,
      maxSchemaFields: 120,
      waitForResults: true,
      maxWaitTimeoutSeconds: 300,
      requestsPerMinute: 600,
    },
    features: [
      "5,000 emails / week",
      "Latest models — Fable, GPT, and Sonnet",
      "Scheduled cron jobs",
      "Slack, webhooks, CRM, and summaries",
      "Multiple mailboxes",
      "Priority email support",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Company-wide mail on your own schedule",
    priceMonthlyUsd: 109.99,
    limits: {
      emailsPerPeriod: 20_000,
      emailQuotaPeriod: "week",
      extractionsPerDay: 1500,
      maxSchemaFields: 250,
      waitForResults: true,
      maxWaitTimeoutSeconds: 600,
      requestsPerMinute: 2000,
    },
    features: [
      "20,000 emails / week",
      "Latest models — Fable, GPT, Sonnet, and Opus",
      "Custom cron schedules",
      "Every tool connection, plus summaries",
      "Dedicated success manager",
      "Custom SLA and SSO-ready controls",
    ],
  },
};

export const DEFAULT_PLAN_ID: PlanId = "free";

export const BETA_DISCLAIMER =
  "Plans include model selection by tier. Monthly price locks at checkout when billing is enabled.";

export const BETA_ACCESS_NOTICE =
  "Basic is free. Standard is $24.99/mo with cron jobs, tool connections, and current models.";

export const BETA_LAUNCH_LABEL = "Inbox automation for teams";

export const FIRST_MONTH_DISCOUNT_LABEL = "50% off your first month when billing is enabled";

export function formatUsdPrice(amount: number | null, options?: { suffix?: string }): string {
  if (amount === null) return "Contact us";
  if (amount === 0) return "Free";
  const suffix = options?.suffix ?? "/mo";
  return `$${amount.toFixed(2)}${suffix}`;
}

export function formatEmailQuota(plan: PlanDefinition): string {
  const { emailsPerPeriod, emailQuotaPeriod } = plan.limits;
  const periodLabel = emailQuotaPeriod === "day" ? "day" : "week";
  return `${emailsPerPeriod.toLocaleString()} emails / ${periodLabel}`;
}
