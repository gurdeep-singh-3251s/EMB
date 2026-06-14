import { getAuthToken } from "@/lib/authSession";

const API_KEY_STORAGE = "extractpilot_api_key";

/** Session JWT first, then browser localStorage API key, then hosted demo key from build env. */
export function resolveApiKey(): string {
  const session = getAuthToken();
  if (session) return session;
  const stored = getStoredApiKey();
  if (stored) return stored;
  return process.env.NEXT_PUBLIC_DEMO_API_KEY?.trim() ?? "";
}

export function getStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(API_KEY_STORAGE)?.trim() ?? "";
}

export function setStoredApiKey(key: string): void {
  if (typeof window === "undefined") return;
  if (key.trim()) {
    window.localStorage.setItem(API_KEY_STORAGE, key.trim());
  } else {
    window.localStorage.removeItem(API_KEY_STORAGE);
  }
}

export type ApiResult<T> =
  | { success: true; message: string | null; data: T }
  | { success: false; message: string; error: unknown };

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const apiKey = resolveApiKey();
  const headers: Record<string, string> = {
    accept: "application/json",
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  let res: Response;
  try {
    res = await fetch(path, { ...init, headers });
  } catch {
    return { success: false, message: "Network error — is the API server running?", error: null };
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const snippet = (await res.text()).trim().slice(0, 200);
    const hint =
      res.status === 500 && snippet.length === 0
        ? " — the request may have timed out (mailbox fetch can take a while; try again)"
        : snippet
          ? `: ${snippet}`
          : "";
    return {
      success: false,
      message: `Unexpected response (${res.status})${hint}`,
      error: snippet || null,
    };
  }

  const body = (await res.json()) as ApiResult<T>;
  if (!res.ok && body.success !== false) {
    return {
      success: false,
      message: `Request failed (${res.status})`,
      error: null,
    };
  }
  return body;
}
