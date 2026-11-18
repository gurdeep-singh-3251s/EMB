import { apiFetch, type ApiResult } from "./apiClient";

export type { ApiResult };

export type FieldSpec = {
  type: "string" | "number" | "boolean" | "enum" | "array" | "object";
  nullable?: boolean;
  description?: string;
  values?: string[];
};

export type UserQueryRow = {
  id: string;
  name: string | null;
  userQuery: string;
  outputSchema: Record<string, FieldSpec>;
  classifyModel: string | null;
  extractModel: string | null;
  status: "active" | "paused" | "closed";
  createdAt: string;
};

export type LlmModelsResponse = {
  planId: string;
  planName: string;
  defaults: { classify: string; extract: string };
  models: Array<{
    id: string;
    label: string;
    description: string;
    minPlan: string;
    tier: string;
    costHint: string;
    recommendedFor: "classify" | "extract" | "both" | string;
    available?: boolean;
    provider?: string;
  }>;
  catalog?: Array<Record<string, unknown>>;
  stats?: { onPlan: number; availableOnPlan: number; catalogTotal: number };
  policy?: {
    modelAllowlist: string[];
    onlyEnterpriseCanPickModels: boolean;
  };
};

export type ExtractedRow = {
  emailId: string;
  subject: string | null;
  sender: string | null;
  processingStatus: string;
  extracted: Record<string, unknown> | null;
  source: {
    rawContent: string | null;
    attachments: Array<{ filename: string; mimeType: string; status: string }>;
  };
};

export type UserQueryStatusCounts = {
  pending: number;
  processing: number;
  completed: number;
  partial: number;
  skipped: number;
  failed: number;
};

export type ResultsPage = {
  userQueryId: string;
  timeRange: string;
  limit: number;
  offset: number;
  total: number;
  count: number;
  completedCount: number;
  hasMore: boolean;
  statusCounts?: UserQueryStatusCounts;
  extractedData: ExtractedRow[];
};

export type ImapProviderPreset = {
  id: string;
  label: string;
  provider: string;
  host: string;
  port: number;
  secure: boolean;
  help: string;
};

export type MailboxConfig = {
  configured: boolean;
  provider: string | null;
  providerPreset: string | null;
  host: string;
  port: number;
  user: string | null;
};

export type LookbackOption = { key: string; hours: number; label: string };

export type EmailDetail = {
  id: string;
  provider: string;
  messageId: string;
  sender: string | null;
  subject: string | null;
  processingStatus: string;
  attachmentCount: number;
  createdAt: string;
  rawContent: string | null;
  userQueryId: string | null;
  classificationResult: {
    relevant: boolean;
    confidence?: number;
    reason?: string;
    likelyFields?: string[];
  } | null;
  parsedJson: {
    email: Record<string, unknown>;
    attachments: Array<{
      filename: string;
      mimeType: string;
      status: string;
      data: Record<string, unknown> | null;
      error?: string;
    }>;
    humanReview?: {
      lastEditedAt: string;
      editedFields: string[];
      editedAttachments?: string[];
    };
  } | null;
  extracted: Record<string, unknown> | null;
};

export type StoredEmailAttachment = {
  id: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number | null;
  processingStatus: string;
  extractedText: string | null;
  extractSource: string | null;
  errorMessage: string | null;
  extractedData: Record<string, unknown> | null;
  downloadable: boolean;
};

export const restClient = {
  userQuery: {
    create(body: {
      name?: string;
      userQuery: string;
      outputSchema: Record<string, FieldSpec>;
      classifyModel?: string;
      extractModel?: string;
    }) {
      return apiFetch<UserQueryRow>("/api/v1/user-query", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    current() {
      return apiFetch<UserQueryRow | null>("/api/v1/user-query/current");
    },
    list(params?: { limit?: number; offset?: number }) {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      const qs = q.toString();
      return apiFetch<{ items: UserQueryRow[]; total: number }>(`/api/v1/user-queries${qs ? `?${qs}` : ""}`);
    },
    activate(id: string) {
      return apiFetch<UserQueryRow>(`/api/v1/user-queries/${id}/activate`, { method: "POST" });
    },
    results(params?: {
      limit?: number;
      offset?: number;
      timeRange?: string;
      includeInProgress?: boolean;
      userQueryId?: string;
    }) {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      if (params?.timeRange) q.set("timeRange", params.timeRange);
      if (params?.includeInProgress) q.set("includeInProgress", "true");
      const qs = q.toString();
      const base =
        params?.userQueryId && params.userQueryId !== "current"
          ? `/api/v1/user-query/${params.userQueryId}/results`
          : `/api/v1/user-query/current/results`;
      return apiFetch<ResultsPage>(`${base}${qs ? `?${qs}` : ""}`);
    },
  },
  promptStudio: {
    models() {
      return apiFetch<LlmModelsResponse>("/api/v1/llm-models");
    },
    enhance(body: {
      userQuery: string;
      goal?: string;
      model?: string;
      currentSchema?: Record<string, unknown>;
    }) {
      return apiFetch<{
        userQuery: string;
        rationale?: string;
        modelUsed: string;
        outputSchema?: Record<string, FieldSpec> | null;
      }>("/api/v1/prompt-studio/enhance", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    enhancements() {
      return apiFetch<{ items: Array<Record<string, unknown>> }>("/api/v1/prompt-studio/enhancements");
    },
    abCompare(body: { emailId: string; promptAId: string; promptBId: string }) {
      return apiFetch<{
        id: string;
        relevantA: boolean;
        relevantB: boolean;
        fieldDiffs: Array<{ field: string; valueA: unknown; valueB: unknown; match: boolean }>;
      }>("/api/v1/prompt-studio/ab-compare", { method: "POST", body: JSON.stringify(body) });
    },
    abHistory() {
      return apiFetch<{ items: Array<Record<string, unknown>> }>("/api/v1/prompt-studio/ab-history");
    },
  },
  mailbox: {
    config() {
      return apiFetch<MailboxConfig>("/api/v1/mailbox/config");
    },
    providers() {
      return apiFetch<{ presets: ImapProviderPreset[] }>("/api/v1/mailbox/providers");
    },
    connect(body: {
      user: string;
      password: string;
      host?: string;
      port?: number;
      provider?: string;
      providerPreset?: string;
    }) {
      return apiFetch<{
        provider: string;
        providerPreset: string | null;
        host: string;
        port: number;
        user: string;
      }>("/api/v1/mailbox/config", {
        method: "PUT",
        body: JSON.stringify(body),
      });
    },
    disconnect() {
      return apiFetch<null>("/api/v1/mailbox/config", { method: "DELETE" });
    },
    lookbackOptions() {
      return apiFetch<{ options: LookbackOption[]; defaultEnvHours: number }>(
        "/api/v1/mailbox/lookback-options",
      );
    },
    extractEmails(body: {
      lookback?: string;
      unreadOnly?: boolean;
      waitForResults?: boolean;
      waitTimeoutSeconds?: number;
    }) {
      return apiFetch<{
        imapFetched: number;
        enqueued: number;
        count?: number;
        completedCount?: number;
        timedOut?: boolean;
        extractedData?: ExtractedRow[];
      }>("/api/v1/mailbox/extract-emails", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
  },
  mailboxes: {
    list() {
      return apiFetch<{ mailboxes: Array<Record<string, unknown>> }>("/api/v1/mailboxes");
    },
    connect(body: {
      user: string;
      password: string;
      host?: string;
      port?: number;
      provider?: string;
      providerPreset?: string;
      label?: string;
      setActive?: boolean;
    }) {
      return apiFetch<{ mailbox: Record<string, unknown>; mailboxes: Array<Record<string, unknown>> }>(
        "/api/v1/mailboxes",
        { method: "POST", body: JSON.stringify(body) },
      );
    },
    activate(mailboxId: string) {
      return apiFetch<{ mailboxes: Array<Record<string, unknown>> }>("/api/v1/mailboxes/activate", {
        method: "POST",
        body: JSON.stringify({ mailboxId }),
      });
    },
    remove(mailboxId: string) {
      return apiFetch<{ mailboxes: Array<Record<string, unknown>> }>(`/api/v1/mailboxes/${mailboxId}`, {
        method: "DELETE",
      });
    },
  },
  ops: {
    health() {
      return apiFetch<Record<string, unknown>>("/api/v1/ops/health");
    },
    failures() {
      return apiFetch<{ items: Array<Record<string, unknown>> }>("/api/v1/ops/failures");
    },
    retryFailure(body: { emailId?: string; failedJobId?: string }) {
      return apiFetch<{ emailId: string; requeued: boolean }>("/api/v1/ops/retry-failure", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    retryAllFailures() {
      return apiFetch<{ requeued: number }>("/api/v1/ops/retry-all-failures", { method: "POST" });
    },
    replayDlq(limit?: number) {
      return apiFetch<{ replayed: number; scanned: number }>("/api/v1/ops/replay-dlq", {
        method: "POST",
        body: JSON.stringify({ limit }),
      });
    },
  },
  integrations: {
    get() {
      return apiFetch<{
        webhookUrl: string | null;
        slackWebhookUrl: string | null;
        notifyOnExtractionCompleted: boolean;
        notifyOnFailure: boolean;
      }>("/api/v1/integrations");
    },
    patch(body: Partial<{
      webhookUrl: string | null;
      slackWebhookUrl: string | null;
      notifyOnExtractionCompleted: boolean;
      notifyOnFailure: boolean;
    }>) {
      return apiFetch<Record<string, unknown>>("/api/v1/integrations", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
  },
  auditLog: {
    list(limit?: number) {
      const qs = limit ? `?limit=${limit}` : "";
      return apiFetch<{ items: Array<{ id: string; action: string; detail: unknown; createdAt: string }> }>(
        `/api/v1/audit-log${qs}`,
      );
    },
  },
  workspace: {
    get() {
      return apiFetch<{
        planId: string;
        seats: { used: number; limit: number; inviteComingSoon: boolean };
        members: Array<{ id: string; email: string | null; name: string | null; role: string }>;
      }>("/api/v1/workspace");
    },
  },
  plans: {
    list() {
      return apiFetch<{
        beta: boolean;
        inviteOnly?: boolean;
        disclaimer: string;
        accessNotice?: string;
        launchLabel?: string;
        activePlanId: string;
        plans: Array<{
          id: string;
          name: string;
          tagline: string;
          priceMonthlyUsd: number | null;
          limits: Record<string, number | boolean>;
          features: string[];
        }>;
        billingEnabled?: boolean;
        checkoutMode?: "stripe" | "demo" | "off";
      }>("/api/v1/plans");
    },
  },
  usage: {
    get() {
      return apiFetch<{
        planId: string;
        planName: string;
        emailsUsed: number;
        emailsLimit: number | null;
        emailQuotaPeriod: "day" | "week";
        extractionsToday: number;
        extractionsLimitDay: number | null;
        unlimitedQuota?: boolean;
        beta: boolean;
        disclaimer: string;
      }>("/api/v1/usage");
    },
  },
  billing: {
    status() {
      return apiFetch<{
        activePlanId: string;
        billingEnabled: boolean;
        inviteOnly: boolean;
      }>("/api/v1/billing/status");
    },
    checkout(planId: "standard" | "premium" | "enterprise") {
      return apiFetch<{ url: string | null; sessionId: string }>("/api/v1/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planId }),
      });
    },
    checkoutSetup() {
      return apiFetch<{ url: string | null; sessionId: string }>("/api/v1/billing/checkout-setup", {
        method: "POST",
      });
    },
    portal() {
      return apiFetch<{ url: string }>("/api/v1/billing/portal", { method: "POST" });
    },
  },
  emails: {
    byId(id: string) {
      return apiFetch<EmailDetail>(`/api/v1/emails/${id}`);
    },
    patchExtracted(
      id: string,
      body: {
        fields?: Record<string, unknown>;
        attachments?: Array<{ filename: string; data: Record<string, unknown> }>;
      },
    ) {
      return apiFetch<EmailDetail>(`/api/v1/emails/${id}/extracted`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    list(params?: { limit?: number; offset?: number }) {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      const qs = q.toString();
      return apiFetch<
        Array<{
          id: string;
          subject: string | null;
          sender: string | null;
          processingStatus: string;
          attachmentCount: number;
          createdAt: string;
        }>
      >(`/api/v1/emails${qs ? `?${qs}` : ""}`);
    },
    attachments(emailId: string) {
      return apiFetch<StoredEmailAttachment[]>(`/api/v1/emails/${emailId}/attachments`);
    },
    attachmentDownloadUrl(emailId: string, attachmentId: string) {
      return `/api/v1/emails/${emailId}/attachments/${attachmentId}/download`;
    },
  },
};
