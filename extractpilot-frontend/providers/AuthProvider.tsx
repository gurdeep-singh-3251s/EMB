"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/apiClient";
import { clearAuthToken, getAuthToken, setAuthToken, type AuthUser } from "@/lib/authSession";

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => void;
  applyToken: (token: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthState | null>(null);

async function fetchMe(): Promise<AuthUser | null> {
  const res = await apiFetch<AuthUser>("/api/v1/auth/me");
  if (!res.success) return null;
  return res.data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getAuthToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    const me = await fetchMe();
    if (!me) {
      clearAuthToken();
      setUser(null);
    } else {
      setUser(me);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const applyToken = useCallback(async (token: string): Promise<boolean> => {
    setAuthToken(token);
    setLoading(true);
    const me = await fetchMe();
    if (!me) {
      clearAuthToken();
      setUser(null);
      setLoading(false);
      return false;
    }
    setUser(me);
    setLoading(false);
    return true;
  }, []);

  const signOut = useCallback(() => {
    clearAuthToken();
    setUser(null);
    void apiFetch("/api/v1/auth/logout", { method: "POST" });
  }, []);

  const value = useMemo(
    () => ({ user, loading, refresh, signOut, applyToken }),
    [user, loading, refresh, signOut, applyToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
