import type { MailProviderOverrides } from "@repo/types/mailProviderOverrides";
import { EmailProvider } from "@repo/types/email";
import type { EmailRunnerResult } from "@repo/types/email";
import {
  IMAP_PROVIDER_PRESETS,
  inferImapProvider,
  presetById,
  type ImapProviderPresetId,
} from "@repo/types/imapProviders";
import {
  EMAIL_LOOKBACK_OPTIONS,
  resolveLookbackHours,
  type EmailLookbackKey,
} from "@repo/feature-ingestion";
import { PLANS } from "@repo/config/plans";
import type {
  RestDisconnectedMailboxData,
  RestExtractEmailsBaseData,
  RestExtractEmailsData,
  RestExtractEmailsWaitData,
  RestHandlerDeps,
  RestLookbackOption,
  RestLookbackOptionsData,
  RestMailboxConfigData,
  RestMailboxConnectedData,
} from "@repo/types/restTypes";
import { buildUserQueryResultsPayload, pollUserQueryResults } from "../helper/userQueryResults";
import { checkExtractionAllowed, getActivePlanId } from "../middleware/planLimits";
import { BaseRestController } from "../helper/init";
import { getRuntimeImapCredentials, setRuntimeImapCredentials, clearRuntimeImapCredentials } from "../helper/runtimeImapConfig";
import { imapCredentialsBodySchema, imapFetchBodySchema } from "../swagger/schemas";
import { ExtractionProgressPublisher } from "@repo/feature-queue";

type ImapCredentialSource = "runtime" | "env" | "none";

type ResolvedImapCredentials = {
  provider: EmailProvider;
  providerPreset: ImapProviderPresetId | null;
  host: string;
  port: number;
  user: string;
  password: string;
  source: ImapCredentialSource;
};

class MailboxHandler extends BaseRestController {
  providerOptions(): Response {
    return this.success({ presets: IMAP_PROVIDER_PRESETS }, null, 200);
  }

  lookbackOptions(): Response {
    const options: RestLookbackOption[] = (
      Object.entries(EMAIL_LOOKBACK_OPTIONS) as [EmailLookbackKey, (typeof EMAIL_LOOKBACK_OPTIONS)[EmailLookbackKey]][]
    ).map(([key, spec]) => ({
      key,
      hours: spec.hours,
      label: spec.label,
    }));
    const data: RestLookbackOptionsData = {
      options,
      defaultEnvHours: this.deps.env.imapFetchSinceHours,
    };
    return this.success(data, null, 200);
  }

  getConfig(): Response {
    const creds = this.resolveImapCredentials();
    const data: RestMailboxConfigData = {
      configured: creds.source !== "none",
      provider: creds.source !== "none" ? creds.provider : null,
      providerPreset: creds.providerPreset,
      host: creds.host,
      port: creds.port,
      user: this.resolveConfigUser(creds.user),
    };
    return this.success(data, null, 200);
  }

  async putConfig(req: Request): Promise<Response> {
    const body = await this.readJson(req);
    const parsed = imapCredentialsBodySchema.safeParse(body);
    if (!parsed.success) {
      return this.validationError(parsed.error.message, parsed.error.flatten());
    }

    const preset = parsed.data.providerPreset
      ? presetById(parsed.data.providerPreset)
      : null;

    let host = preset?.host ?? "imap.gmail.com";
    if (parsed.data.host !== undefined && parsed.data.host.length > 0) {
      host = parsed.data.host;
    }
    let port = preset?.port ?? 993;
    if (parsed.data.port !== undefined) {
      port = parsed.data.port;
    }

    let provider: EmailProvider = preset?.provider ?? inferImapProvider(host);
    if (parsed.data.provider !== undefined) {
      provider = parsed.data.provider as EmailProvider;
    }

    const credentials = {
      provider,
      providerPreset: parsed.data.providerPreset ?? null,
      host,
      port,
      user: parsed.data.user,
      password: parsed.data.password,
    };
    setRuntimeImapCredentials(credentials);

    const data: RestMailboxConnectedData = {
      provider: credentials.provider,
      providerPreset: credentials.providerPreset,
      host: credentials.host,
      port: credentials.port,
      user: credentials.user,
    };
    return this.success(data, "Connected", 200);
  }

  deleteConfig(): Response {
    clearRuntimeImapCredentials();
    const data: RestDisconnectedMailboxData = null;
    return this.success(data, "Disconnected", 200);
  }

  async extractEmails(req: Request): Promise<Response> {
    try {
      return await this.extractEmailsHandler(req);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extract emails failed";
      console.error("[mailbox] extractEmails error", err);
      return Response.json({ success: false, message, error: null }, { status: 500 });
    }
  }

  private async extractEmailsHandler(req: Request): Promise<Response> {
    const body = await this.readJson(req);
    const parsed = imapFetchBodySchema.safeParse(this.resolveFetchBody(body));
    if (!parsed.success) {
      return this.validationError(parsed.error.message, parsed.error.flatten());
    }

    const planId = await getActivePlanId(this.deps.getDb(), this.deps.env);
    const plan = PLANS[planId];
    const limitCheck = await checkExtractionAllowed(this.deps.getDb(), planId, {
      unlimited: this.deps.env.betaUnlimitedQuota,
    });
    if (!limitCheck.ok) {
      return this.validationError(limitCheck.message, null);
    }

    const waitTimeoutSeconds = parsed.data.waitForResults
      ? Math.min(parsed.data.waitTimeoutSeconds, plan.limits.maxWaitTimeoutSeconds)
      : parsed.data.waitTimeoutSeconds;

    const overrides = this.buildFetchOverrides(
      parsed.data.lookback,
      parsed.data.unreadOnly,
      parsed.data.markSeenOnEnqueue,
    );
    if (overrides === null) {
      return this.validationError("Mailbox not connected.", null);
    }

    if (this.deps.env.requireActiveUserQuery) {
      const active = await this.ctx.services.userQuery.getActive();
      if (!active.success) {
        return this.fromDto(active);
      }
      if (active.data === null) {
        return this.validationError(
          "No active user query. Set one with POST /api/v1/user-query.",
          null,
        );
      }
    }

    const activeQuery = await this.ctx.services.userQuery.getActive();
    const userQueryId = activeQuery.success ? activeQuery.data?.id ?? null : null;
    const progress = this.progressPublisher();
    progress?.phase(userQueryId, "fetching");

    const result = await this.deps.getEmailService().runner(overrides);
    if (!result.success) {
      return this.fromDto(result);
    }

    progress?.fetch(userQueryId ?? result.data.activeUserQueryId, result.data.imapFetched, result.data.enqueued);
    if (result.data.enqueued === 0) {
      progress?.phase(userQueryId ?? result.data.activeUserQueryId, "complete");
    }

    const data = await this.buildExtractEmailsResponseData(result.data, {
      ...parsed.data,
      waitTimeoutSeconds,
    });
    return this.success(data, null, 200);
  }

  private async buildExtractEmailsResponseData(
    runner: EmailRunnerResult,
    fetchInput: {
      waitForResults: boolean;
      waitTimeoutSeconds: number;
    },
  ): Promise<RestExtractEmailsData> {
    const base: RestExtractEmailsBaseData = {
      imapFetched: runner.imapFetched,
      enqueued: runner.enqueued,
    };

    const shouldWait =
      fetchInput.waitForResults &&
      runner.activeUserQueryId !== null &&
      runner.enqueued > 0;

    if (!shouldWait) {
      return base;
    }

    const requestId = runner.activeUserQueryId as string;
    const poll = await pollUserQueryResults(this.ctx, requestId, {
      timeoutMs: fetchInput.waitTimeoutSeconds * 1000,
      intervalMs: undefined,
      limit: undefined,
    });
    const built = buildUserQueryResultsPayload(poll.rows);
    const payload = this.toUserQueryResultsPublic(built);
    const waitData: RestExtractEmailsWaitData = {
      imapFetched: base.imapFetched,
      enqueued: base.enqueued,
      extractedData: payload.extractedData,
      completedCount: built.completedCount,
      processedCount: built.processedCount,
      count: poll.total > 0 ? poll.total : built.count,
      timedOut: poll.timedOut,
    };
    return waitData;
  }

  private progressPublisher(): ExtractionProgressPublisher | null {
    const redis = this.deps.getRedis();
    if (!redis) return null;
    return new ExtractionProgressPublisher(redis);
  }

  private resolveConfigUser(user: string): string | null {
    if (user.length > 0) {
      return user;
    }
    return null;
  }

  private resolveFetchBody(body: unknown): Record<string, never> {
    if (body === null) {
      return {};
    }
    return body as Record<string, never>;
  }

  private resolveImapCredentials(): ResolvedImapCredentials {
    const runtime = getRuntimeImapCredentials();
    if (runtime !== null) {
      return {
        ...runtime,
        providerPreset: runtime.providerPreset ?? null,
        source: "runtime",
      };
    }
    if (this.deps.env.imapGmail.user.length > 0 && this.deps.env.imapGmail.password.length > 0) {
      const host = this.deps.env.imapGmail.host;
      return {
        provider: inferImapProvider(host),
        providerPreset: null,
        host,
        port: this.deps.env.imapGmail.port,
        user: this.deps.env.imapGmail.user,
        password: this.deps.env.imapGmail.password,
        source: "env",
      };
    }
    return {
      provider: EmailProvider.Gmail,
      providerPreset: null,
      host: this.deps.env.imapGmail.host,
      port: this.deps.env.imapGmail.port,
      user: "",
      password: "",
      source: "none",
    };
  }

  private buildFetchOverrides(
    lookback: EmailLookbackKey,
    unreadOnly: boolean,
    markSeenOnEnqueue: boolean | undefined,
  ): MailProviderOverrides | null {
    const creds = this.resolveImapCredentials();
    if (creds.source === "none") {
      return null;
    }

    const overrides: MailProviderOverrides = {
      provider: creds.provider,
      sinceHours: resolveLookbackHours(lookback),
      unreadOnly,
      imap: {
        host: creds.host,
        port: creds.port,
        user: creds.user,
        password: creds.password,
      },
    };

    if (markSeenOnEnqueue !== undefined) {
      overrides.markSeenOnSuccess = markSeenOnEnqueue;
    }

    return overrides;
  }
}

async function handleMailboxRouter(req: Request, deps: RestHandlerDeps): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;
  const handler = new MailboxHandler(deps);

  if (path === "/api/v1/mailbox/providers" && req.method === "GET") {
    return handler.providerOptions();
  }

  if (path === "/api/v1/mailbox/lookback-options" && req.method === "GET") {
    return handler.lookbackOptions();
  }

  if (path === "/api/v1/mailbox/config" && req.method === "GET") {
    return handler.getConfig();
  }

  if (path === "/api/v1/mailbox/config" && req.method === "PUT") {
    return handler.putConfig(req);
  }

  if (path === "/api/v1/mailbox/config" && req.method === "DELETE") {
    return handler.deleteConfig();
  }

  if (path === "/api/v1/mailbox/extract-emails" && req.method === "POST") {
    return handler.extractEmails(req);
  }

  return null;
}

export { handleMailboxRouter };
