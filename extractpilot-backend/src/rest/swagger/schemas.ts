import { z } from "zod";
import {
  RESULTS_TIME_RANGE_OPTIONS,
  createUserQuerySchema,
  type ResultsTimeRangeKey,
} from "@repo/feature-user-query";
import { EMAIL_LOOKBACK_OPTIONS, type EmailLookbackKey } from "@repo/feature-ingestion";

const emailLookbackKeys = Object.keys(EMAIL_LOOKBACK_OPTIONS) as [EmailLookbackKey, ...EmailLookbackKey[]];

const emailLookbackSchema = z.enum(emailLookbackKeys);

function parseQueryBoolean(value: unknown): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return value;
}

const createUserQueryBodySchema = createUserQuerySchema;

const imapProviderPresetSchema = z.enum(["gmail", "outlook", "zoho", "yahoo", "icloud", "custom"]);

const imapProviderSchema = z.enum(["gmail", "zoho", "outlook", "imap"]);

const imapCredentialsBodySchema = z.object({
  provider: imapProviderSchema.optional(),
  providerPreset: imapProviderPresetSchema.optional(),
  host: z.string().min(1).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  user: z.string().min(1),
  password: z.string().min(1),
});

const imapFetchBodySchema = z.object({
  lookback: emailLookbackSchema.default("1day"),
  unreadOnly: z.boolean().default(false),
  markSeenOnEnqueue: z.boolean().optional(),
  waitForResults: z.boolean().default(false),
  waitTimeoutSeconds: z.number().int().min(5).max(300).default(120),
});

const resultsTimeRangeKeys = Object.keys(RESULTS_TIME_RANGE_OPTIONS) as [
  ResultsTimeRangeKey,
  ...ResultsTimeRangeKey[],
];

const userQueryResultsTimeRangeSchema = z.enum(resultsTimeRangeKeys);

const userQueryResultsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  timeRange: userQueryResultsTimeRangeSchema.default("all"),
  includeInProgress: z.preprocess(parseQueryBoolean, z.boolean().default(false)),
});

export {
  createUserQueryBodySchema,
  userQueryResultsQuerySchema,
  imapCredentialsBodySchema,
  imapFetchBodySchema,
};
