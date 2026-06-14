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
  userQuery: string;
  outputSchema: Record<string, FieldSpec>;
  status: "active" | "paused" | "closed";
  createdAt: string;
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
    create(body: { userQuery: string; outputSchema: Record<string, FieldSpec> }) {
      return apiFetch<UserQueryRow>("/api/v1/user-query", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    current() {
      return apiFetch<UserQueryRow | null>("/api/v1/user-query/current");
    },
    results(params?: {
      limit?: number;
      offset?: number;
      timeRange?: string;
      includeInProgress?: boolean;
    }) {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      if (params?.timeRange) q.set("timeRange", params.timeRange);
      if (params?.includeInProgress) q.set("includeInProgress", "true");
      const qs = q.toString();
      return apiFetch<ResultsPage>(`/api/v1/user-query/current/results${qs ? `?${qs}` : ""}`);
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
    checkout(planId: "standard" | "premium") {
      return apiFetch<{ url: string | null; sessionId: string }>("/api/v1/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planId }),
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
