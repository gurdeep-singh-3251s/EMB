export const EMAIL_LOOKBACK_OPTIONS = {
  "1hour": { label: "Last hour", hours: 1 },
  "6hours": { label: "Last 6 hours", hours: 6 },
  "12hours": { label: "Last 12 hours", hours: 12 },
  "1day": { label: "Last day", hours: 24 },
  "3days": { label: "Last 3 days", hours: 72 },
  "1week": { label: "Last week", hours: 168 },
} as const;

export type EmailLookbackKey = keyof typeof EMAIL_LOOKBACK_OPTIONS;

export function resolveLookbackHours(lookback: EmailLookbackKey): number {
  return EMAIL_LOOKBACK_OPTIONS[lookback].hours;
}
