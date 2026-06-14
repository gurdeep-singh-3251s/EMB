"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

function AuthCallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { applyToken } = useAuth();

  useEffect(() => {
    const token = params.get("token");
    const next = params.get("state") ?? "/dashboard";
    if (!token) {
      router.replace("/login?error=oauth_token");
      return;
    }
    void applyToken(token).then(() => {
      router.replace(next.startsWith("/") ? next : "/dashboard");
    });
  }, [params, router, applyToken]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
      Completing sign-in…
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>}>
      <AuthCallbackInner />
    </Suspense>
  );
}
