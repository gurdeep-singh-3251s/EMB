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

/** Optional paid onboarding — Connect your workspace for brokerages & ops teams. */
export const SETUP_OFFER = {
  id: "setup-onboarding",
  name: "Connect your workspace",
  tagline:
    "White-glove session for your brokerage: connect Gmail / Outlook inboxes, load real-estate prompts, run a live extract, and hand off to managers.",
  priceUsd: 99.99,
  compareAtUsd: 499,
  badge: "Recommended for teams",
  savingsLabel: "Save $399",
  features: [
    "Connect multiple agent & office Gmail inboxes",
    "Real-estate prompt pack installed (leads, listings, closings)",
    "Confidence scores explained for your managers",
    "Live test extract on your real mailbox",
  ],
} as const;

export const PAID_PLAN_ORDER: PlanId[] = ["standard", "premium", "enterprise"];

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Starter",
    tagline: "Prove it on one agent inbox — no card required",
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
      "10 extraction runs / day",
      "Up to 10 schema fields",
      "Multiple Gmail & IMAP mailboxes",
      "Real-estate prompt templates",
      "Fast AI models (10+)",
      "Confidence scores on classifications",
    ],
  },
  standard: {
    id: "standard",
    name: "Team",
    tagline: "Built for brokerage ops & sales managers",
    priceMonthlyUsd: 29.99,
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
      "80 extraction runs / day",
      "Up to 40 schema fields",
      "20+ AI models (pick classify + extract)",
      "Connect your workspace (multi-Gmail)",
      "Confidence scores on every extract",
      "Real-estate lead & listing prompts",
      "Email support",
    ],
  },
  premium: {
    id: "premium",
    name: "Business",
    tagline: "Higher volume for multi-office brokerages",
    priceMonthlyUsd: 79.99,
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
      "300 extraction runs / day",
      "Up to 120 schema fields",
      "35+ AI models including Sonnet & GPT-4o",
      "Multi-office mailbox workflows",
      "Priority queue + confidence review",
      "Webhooks to CRM / Slack",
      "Priority email support",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Full model catalog, compliance, and dedicated success",
    priceMonthlyUsd: 149.99,
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
      "1,500 extraction runs / day",
      "Up to 250 schema fields",
      "50+ AI models (full catalog)",
      "Unavailable-model auto-fallback",
      "Dedicated success manager",
      "Custom SLA & compliance review",
      "SSO-ready workspace controls",
    ],
  },
};

export const DEFAULT_PLAN_ID: PlanId = "free";

export const BETA_DISCLAIMER =
  "Plans include model selection by tier. Monthly price locks at checkout when billing is enabled.";

export const BETA_ACCESS_NOTICE =
  "Team includes 1,000 emails/week and 20+ AI models — ideal for real-estate managers running a live demo.";

export const BETA_LAUNCH_LABEL = "Built for brokerages";

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
