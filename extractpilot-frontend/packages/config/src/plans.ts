export type PlanId = "free" | "standard" | "premium";

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
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free Demo",
    tagline: "Beta pre-launch — try the full pipeline on a small volume",
    priceMonthlyUsd: null,
    limits: {
      emailsPerPeriod: 50,
      emailQuotaPeriod: "day",
      extractionsPerDay: 10,
      maxSchemaFields: 10,
      waitForResults: true,
      maxWaitTimeoutSeconds: 60,
      requestsPerMinute: 30,
    },
    features: [
      "Unlimited emails during closed beta",
      "Unlimited extraction runs during beta",
      "Up to 10 schema fields",
      "Gmail, Outlook, Zoho & IMAP",
      "Community support",
    ],
  },
  standard: {
    id: "standard",
    name: "Standard",
    tagline: "For growing teams automating inbox workflows",
    priceMonthlyUsd: null,
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
      "Priority processing",
      "Email support",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    tagline: "High volume and advanced integrations",
    priceMonthlyUsd: null,
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
      "Dedicated support",
      "Custom SLA (contact us)",
    ],
  },
};

export const DEFAULT_PLAN_ID: PlanId = "free";

export const BETA_DISCLAIMER =
  "ExtractPilot is in closed beta. Official launch is coming soon — limits and pricing may change before general availability.";

export const BETA_ACCESS_NOTICE =
  "Real-world testing only. Access is limited to selected users invited by our team. Paid plans and self-serve checkout are disabled until official launch.";

export const BETA_LAUNCH_LABEL = "Official launch coming soon";

export function formatEmailQuota(plan: PlanDefinition): string {
  const { emailsPerPeriod, emailQuotaPeriod } = plan.limits;
  const periodLabel = emailQuotaPeriod === "day" ? "day" : "week";
  return `${emailsPerPeriod.toLocaleString()} emails / ${periodLabel}`;
}
