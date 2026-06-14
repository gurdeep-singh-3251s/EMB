export function emailQuotaLabel(period: "day" | "week"): string {
  return period === "day" ? "Emails today" : "Emails this week";
}

export function formatQuotaUsage(used: number, limit: number | null, unlimited?: boolean): string {
  if (unlimited || limit === null) {
    return `${used.toLocaleString()} (unlimited during beta)`;
  }
  return `${used.toLocaleString()} / ${limit.toLocaleString()}`;
}
