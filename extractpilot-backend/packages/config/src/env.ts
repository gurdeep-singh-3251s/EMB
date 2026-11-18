import { resolveAttachmentsRoot } from "./paths";

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`Invalid number for ${name} in .env`);
  return n;
}

function resolvePaddleOcrApiMode(): "layout-parsing" | "aistudio-jobs" {
  const raw = process.env.PADDLEOCR_API_MODE?.trim();
  if (raw === "layout-parsing" || raw === "aistudio-jobs") return raw;
  const url = process.env.PADDLEOCR_API_URL ?? "";
  if (url.includes("/api/v2/ocr/jobs")) return "aistudio-jobs";
  return "layout-parsing";
}

function envEnum<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  if (!allowed.includes(raw as T)) {
    throw new Error(`Invalid ${name} in .env — expected one of: ${allowed.join(", ")}`);
  }
  return raw as T;
}

/** OAuth + Swagger public URL. Prefer API_PUBLIC_URL; fall back to proxy headers on Render/Vercel. */
export function resolveApiPublicUrl(req: Request, fallback: string): string {
  const configured = process.env.API_PUBLIC_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
    ?? req.headers.get("host")?.trim();
  if (!host || host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    return fallback.replace(/\/$/, "");
  }

  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
  return `${proto}://${host}`.replace(/\/$/, "");
}

export function loadEnv() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();

  return {
    port: envNumber("PORT", 3002),
    clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
    databaseUrl,
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
    workerConcurrency: envNumber("WORKER_CONCURRENCY", 5),
    attachmentsRoot: resolveAttachmentsRoot(
      process.env.ATTACHMENTS_ROOT ?? "./data/attachments",
    ),
    maxAttachmentSizeMb: envNumber("MAX_ATTACHMENT_SIZE_MB", 25),
    maxAttachmentsPerEmail: envNumber("MAX_ATTACHMENTS_PER_EMAIL", 20),
    cronSchedule: process.env.CRON_SCHEDULE ?? "0 * * * *",
    enableCron: process.env.ENABLE_CRON === "true",
    imapFetchSinceHours: envNumber("IMAP_FETCH_SINCE_HOURS", 1),
    imapUnreadOnly: process.env.IMAP_UNREAD_ONLY !== "false",
    imapMarkSeenOnEnqueue: process.env.IMAP_MARK_SEEN_ON_ENQUEUE === "true",
    imapGmail: {
      host: process.env.IMAP_GMAIL_HOST ?? "imap.gmail.com",
      port: envNumber("IMAP_GMAIL_PORT", 993),
      user: process.env.IMAP_GMAIL_USER ?? "",
      password: (process.env.IMAP_GMAIL_PASSWORD ?? "").replace(/\s/g, ""),
    },
    attachmentFailPolicy: envEnum("ATTACHMENT_FAIL_POLICY", ["partial", "strict"] as const, "partial"),
    attachmentMode: envEnum("ATTACHMENT_MODE", ["stub", "full"] as const, "stub"),
    pipelineDebug: process.env.PIPELINE_DEBUG === "true",
    requireActiveUserQuery: process.env.REQUIRE_ACTIVE_USER_QUERY !== "false",
    /** Server-to-server integrator key (use X-API-Key header only when OAuth is on). */
    restApiKey: process.env.REST_API_KEY?.trim() ?? "",
    /**
     * When true, X-API-Key may authenticate non-interactive clients if OAuth is enabled.
     * Bearer REST_API_KEY is never accepted in production OAuth mode (JWT only).
     */
    integratorApiKeyEnabled: process.env.ALLOW_INTEGRATOR_API_KEY === "true",
    restBodyMaxBytes: envNumber("REST_BODY_MAX_BYTES", 1_048_576),
    rateLimitPublicPerMinute: envNumber("RATE_LIMIT_PUBLIC_PER_MINUTE", 120),
    rateLimitGlobalIpPerMinute: envNumber("RATE_LIMIT_GLOBAL_IP_PER_MINUTE", 300),
    rateLimitExtractPerMinute: envNumber("RATE_LIMIT_EXTRACT_PER_MINUTE", 6),
    cachePublicTtlSeconds: envNumber("CACHE_PUBLIC_TTL_SECONDS", 60),
    cachePlansTtlSeconds: envNumber("CACHE_PLANS_TTL_SECONDS", 30),
    extractDebounceSeconds: envNumber("EXTRACT_DEBOUNCE_SECONDS", 15),
    userQueryDebounceSeconds: envNumber("USER_QUERY_DEBOUNCE_SECONDS", 5),
    queue: {
      jobAttempts: envNumber("QUEUE_JOB_ATTEMPTS", 3),
      backoffMs: envNumber("QUEUE_BACKOFF_MS", 5000),
      removeOnCompleteCount: envNumber("QUEUE_REMOVE_ON_COMPLETE_COUNT", 2000),
      removeOnFailCount: envNumber("QUEUE_REMOVE_ON_FAIL_COUNT", 5000),
    },
    workerLimiter: {
      max: envNumber("WORKER_LIMITER_MAX", 20),
      durationMs: envNumber("WORKER_LIMITER_DURATION_MS", 1000),
    },
    auth: {
      jwtSecret: process.env.JWT_ACCESS_SECRET?.trim() ?? "",
      googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() ?? "",
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "",
      /** Public API URL used for OAuth redirect (defaults to localhost). */
      apiPublicUrl: (process.env.API_PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? "3002"}`).replace(/\/$/, ""),
    },
    attachmentRetentionDays: envNumber("ATTACHMENT_RETENTION_DAYS", 7),
    /** Workspace plan fallback when no Stripe subscription in DB: free | standard | premium */
    activePlan: envEnum("ACTIVE_PLAN", ["free", "standard", "premium", "enterprise"] as const, "free"),
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY?.trim() ?? "",
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "",
      /** Standard tier ($24.99/mo) — plan id `standard` in API */
      priceStandard: process.env.STRIPE_PRICE_STANDARD?.trim() ?? "",
      /** Premium tier ($49.99/mo) — plan id `premium` in API */
      pricePremium: process.env.STRIPE_PRICE_PREMIUM?.trim() ?? "",
      /** Enterprise ($109.99/mo) */
      priceEnterprise: process.env.STRIPE_PRICE_ENTERPRISE?.trim() ?? "",
      /** One-time Connect your business setup ($99.99) */
      priceSetup: process.env.STRIPE_PRICE_SETUP?.trim() ?? "",
      /** Stripe coupon id — e.g. 50% off first month (duration: once) */
      firstMonthCoupon: process.env.STRIPE_COUPON_FIRST_MONTH?.trim() ?? "",
    },
    /** When false (default), Stripe checkout/portal are disabled — beta invite-only mode. */
    enableBilling: process.env.ENABLE_BILLING === "true",
    /**
     * Instant plan upgrades without Stripe (demo / closed beta).
     * Defaults to ON when Stripe checkout is not fully configured.
     * Set ENABLE_DEMO_BILLING=false to force paid checkout only via Stripe.
     */
    enableDemoBilling: (() => {
      const explicit = process.env.ENABLE_DEMO_BILLING?.trim();
      if (explicit === "true") return true;
      if (explicit === "false") return false;
      const stripeReady =
        process.env.ENABLE_BILLING === "true" && Boolean(process.env.STRIPE_SECRET_KEY?.trim());
      return !stripeReady;
    })(),
    /** Closed beta: selected users only; surfaced in API + UI copy. */
    betaInviteOnly: process.env.BETA_INVITE_ONLY !== "false",
    /**
     * When true, email volume and extraction-run quotas are not enforced.
     * Defaults to on during closed beta (BETA_INVITE_ONLY). Set BETA_UNLIMITED_QUOTA=false to enforce plan limits while testing.
     */
    betaUnlimitedQuota: (() => {
      const explicit = process.env.BETA_UNLIMITED_QUOTA?.trim();
      if (explicit === "true") return true;
      if (explicit === "false") return false;
      return process.env.BETA_INVITE_ONLY !== "false";
    })(),
    /** Max auto re-enqueues per email after `failed` (each extract/cron). 0 = disabled. */
    maxFailedEmailRequeues: envNumber("MAX_FAILED_EMAIL_REQUEUES", 3),
    openRouter: {
      apiKey: openRouterKey ?? "",
      model: process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash",
      classifyModel: process.env.OPENROUTER_CLASSIFY_MODEL ?? process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash",
      extractModel: process.env.OPENROUTER_EXTRACT_MODEL ?? process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash",
      baseUrl: process.env.OPENROUTER_BASE_URL,
      debug: process.env.OPENROUTER_DEBUG === "true",
      debugMaxChars: envNumber("OPENROUTER_DEBUG_MAX_CHARS", 4000),
    },
    llm: {
      /** Comma-separated OpenRouter model ids — when set, only these appear for all plans (admin curated). */
      modelAllowlist: (process.env.LLM_MODEL_ALLOWLIST ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      /** When true, only Enterprise workspaces may choose non-default classify/extract models. */
      onlyEnterpriseCanPickModels: process.env.LLM_ONLY_ENTERPRISE_CAN_PICK === "true",
    },
    paddleOcr: {
      apiMode: resolvePaddleOcrApiMode(),
      apiUrl: process.env.PADDLEOCR_API_URL ?? "",
      apiToken: process.env.PADDLEOCR_API_TOKEN ?? "",
      timeoutMs: envNumber("PADDLEOCR_TIMEOUT_MS", 120_000),
      pdfTextMinChars: envNumber("PADDLEOCR_PDF_TEXT_MIN_CHARS", 50),
      model: process.env.PADDLEOCR_MODEL ?? "PaddleOCR-VL-1.6",
      pollIntervalMs: envNumber("PADDLEOCR_POLL_INTERVAL_MS", 5000),
      jobTimeoutMs: envNumber("PADDLEOCR_JOB_TIMEOUT_MS", 300_000),
    },
  };
}

export type Env = ReturnType<typeof loadEnv>;
