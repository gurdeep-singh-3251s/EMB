"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getGoogleLoginUrl } from "@/lib/authSession";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_denied: "Google sign-in was cancelled.",
  oauth_token: "Could not complete Google sign-in. Try again.",
  oauth_profile: "Could not read your Google profile.",
  session: "Signed in with Google but the session could not be verified. Check API_URL on Vercel.",
};

export default function LoginPage() {
  const params = useSearchParams();
  const errorKey = params.get("error");
  const next = params.get("next") ?? "/dashboard";
  const loginUrl = `${getGoogleLoginUrl()}?state=${encodeURIComponent(next)}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-premium">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white">
            EP
          </div>
          <div>
            <p className="font-display text-lg font-bold text-slate-950">ExtractPilot</p>
            <p className="text-xs text-slate-500">Sign in to open the console</p>
          </div>
        </div>

        {errorKey ? (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {ERROR_MESSAGES[errorKey] ?? "Sign-in failed. Please try again."}
          </p>
        ) : null}

        <a
          href={loginUrl}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
        >
          Continue with Google
        </a>

        <p className="mt-6 text-center text-xs text-slate-500">
          New here? Google sign-in creates your account automatically.
        </p>

        <p className="mt-4 text-center text-sm">
          <Link href="/" className="font-medium text-blue-700 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
