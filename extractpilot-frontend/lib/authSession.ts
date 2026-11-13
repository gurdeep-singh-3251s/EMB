const AUTH_TOKEN_STORAGE = "extractpilot_auth_token";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
};

export function getAuthToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE)?.trim() ?? "";
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  if (token.trim()) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE, token.trim());
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE);
  }
}

export function clearAuthToken(): void {
  setAuthToken("");
}

export function getGoogleLoginUrl(): string {
  return "/api/v1/auth/google";
}
