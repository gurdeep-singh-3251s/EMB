export const queryKeys = {
  emails: {
    all: ["emails"] as const,
    list: (params?: { limit?: number; offset?: number }) =>
      [...queryKeys.emails.all, "list", params ?? {}] as const,
    stats: () => [...queryKeys.emails.all, "stats"] as const,
    listPage: (params?: { limit?: number; offset?: number }) =>
      [...queryKeys.emails.all, "listPage", params ?? {}] as const,
    detail: (id: string) => [...queryKeys.emails.all, "detail", id] as const,
    attachments: (emailId: string) => [...queryKeys.emails.all, "attachments", emailId] as const,
  },
  userQuery: {
    all: ["userQuery"] as const,
    current: () => [...queryKeys.userQuery.all, "current"] as const,
    results: (params?: Record<string, unknown>) =>
      [...queryKeys.userQuery.all, "results", params ?? {}] as const,
  },
} as const;

export type UserQueryResultsParams = {
  limit?: number;
  offset?: number;
  timeRange?: string;
  includeInProgress?: boolean;
};
