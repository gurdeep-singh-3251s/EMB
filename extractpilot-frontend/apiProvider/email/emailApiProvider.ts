import { apiFetch } from "@/lib/apiClient";

export type EmailListItemView = {
  id: string;
  provider: string;
  messageId: string;
  sender: string | null;
  subject: string | null;
  processingStatus: string;
  attachmentCount: number;
  createdAt: string;
};

export type EmailStats = Record<string, number> & { total?: number };

export const emailApiProvider = {
  list: (input?: { limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (input?.limit) q.set("limit", String(input.limit));
    if (input?.offset) q.set("offset", String(input.offset));
    const qs = q.toString();
    return apiFetch<EmailListItemView[]>(`/api/v1/emails${qs ? `?${qs}` : ""}`);
  },
  byId: (id: string) => apiFetch<unknown>(`/api/v1/emails/${id}`),
  stats: () => apiFetch<EmailStats>("/api/v1/emails/stats"),
};
