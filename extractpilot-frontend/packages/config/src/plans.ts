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

/** Optional paid onboarding — not required to use the product. */
export const SETUP_OFFER = {
  id: "setup-onboarding",
  name: "Guided setup (optional)",
  tagline:
    "A one-time working session with our team: connect your mailbox, define your extraction fields, run a live test, and hand off docs to your engineers.",
  priceUsd: 99.99,
  compareAtUsd: null,
  badge: "Optional",
  savingsLabel: "",
  features: [
    "60–90 min video call with a product specialist",
    "Mailbox connected and secured in your workspace",
    "Schema tuned on your real email examples",
    "First production extract validated together",
  ],
} as const;

export const PAID_PLAN_ORDER: PlanId[] = ["standard", "premium", "enterprise"];

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Try real extractions on your inbox — no credit card",
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
      "Multiple mailboxes (Gmail, Outlook, IMAP…)",
      "Community support",
      "Fast model tier (Gemini Flash)",
    ],
  },
  standard: {
    id: "standard",
    name: "Team",
    tagline: "More mail per week for a growing ops or finance team",
    priceMonthlyUsd: 29.99,
    popular: true,
    limits: {
      emailsPerPeriod: 500,
      emailQuotaPeriod: "week",
      extractionsPerDay: 50,
      maxSchemaFields: 30,
      waitForResults: true,
      maxWaitTimeoutSeconds: 120,
      requestsPerMinute: 120,
    },
    features: [
      "500 emails / week",
      "50 extraction runs / day",
      "Up to 30 schema fields",
      "Multi-mailbox workflows",
      "Email support",
      "Gemini Flash + Claude Haiku models",
    ],
  },
  premium: {
    id: "premium",
    name: "Business",
    tagline: "Higher volume and faster processing for growing ops",
    priceMonthlyUsd: 49.99,
    limits: {
      emailsPerPeriod: 2500,
      emailQuotaPeriod: "week",
      extractionsPerDay: 200,
      maxSchemaFields: 100,
      waitForResults: true,
      maxWaitTimeoutSeconds: 300,
      requestsPerMinute: 600,
    },
    features: [
      "2,500 emails / week",
      "200 extraction runs / day",
      "Up to 100 schema fields",
      "Priority queue + SLA email support",
      "Multi-mailbox workflows",
      "GPT-4o mini + Claude Sonnet extract models",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Maximum throughput, custom schema depth, and dedicated support",
    priceMonthlyUsd: 99.99,
    limits: {
      emailsPerPeriod: 10_000,
      emailQuotaPeriod: "week",
      extractionsPerDay: 1000,
      maxSchemaFields: 250,
      waitForResults: true,
      maxWaitTimeoutSeconds: 600,
      requestsPerMinute: 2000,
    },
    features: [
      "10,000 emails / week",
      "1,000 extraction runs / day",
      "Up to 250 schema fields",
      "Dedicated success manager",
      "Custom SLA & compliance review",
      "Frontier models (GPT-4o + Sonnet)",
    ],
  },
};

export const DEFAULT_PLAN_ID: PlanId = "free";

export const BETA_DISCLAIMER =
  "You can use the free tier anytime. When you subscribe, your monthly price is locked at checkout.";

export const BETA_ACCESS_NOTICE =
  "Paid plans add higher email limits and faster models. Guided setup is optional — most teams self-serve in under an hour.";

export const BETA_LAUNCH_LABEL = "Monthly plans";

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
