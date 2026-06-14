const STORAGE_KEY = "extractpilot-results-workbench";

export type ResultsWorkbenchPersistedState = {
  timeRange: string;
  offset: number;
  selectedId: string | null;
};

export function loadResultsWorkbenchState(): ResultsWorkbenchPersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResultsWorkbenchPersistedState;
    if (typeof parsed.timeRange !== "string") return null;
    if (typeof parsed.offset !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveResultsWorkbenchState(state: ResultsWorkbenchPersistedState): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
