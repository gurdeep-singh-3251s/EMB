export const RESULTS_TIME_RANGE_OPTIONS = {
  "1hour": { label: "Last hour", hours: 1 },
  "1day": { label: "Last day", hours: 24 },
  "1week": { label: "Last week", hours: 24 * 7 },
  "1month": { label: "Last month", hours: 24 * 30 },
  all: { label: "All time", hours: null },
} as const;

export type ResultsTimeRangeKey = keyof typeof RESULTS_TIME_RANGE_OPTIONS;

export function resolveResultsSince(timeRange: ResultsTimeRangeKey): string | null {
  const spec = RESULTS_TIME_RANGE_OPTIONS[timeRange];
  if (spec.hours === null) {
    return null;
  }
  return new Date(Date.now() - spec.hours * 60 * 60 * 1000).toISOString();
}
