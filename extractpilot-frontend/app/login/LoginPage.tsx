"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { getGoogleLoginUrl } from "@/lib/authSession";
import { useAuth } from "@/providers/AuthProvider";
import { LogoMark, Wordmark } from "@/components/brand/LogoMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_denied: "Google sign-in was cancelled.",
  oauth_token: "Could not complete Google sign-in. Try again.",
  oauth_profile: "Could not read your Google profile.",
  session: "Signed in with Google but the session could not be verified. Check API_URL on Vercel.",
};

const STEPS = [
  { n: "01", title: "Write requirements", body: "Say what to pull from each email." },
  { n: "02", title: "Connect a mailbox", body: "Gmail or IMAP. One active inbox." },
  { n: "03", title: "Extract", body: "Review structured results with scores." },
];

export default function LoginPage() {
  const params = useSearchParams();
  const errorKey = params.get("error");
  const next = params.get("next") ?? "/dashboard";
  const loginUrl = `${getGoogleLoginUrl()}?state=${encodeURIComponent(next)}`;
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[minmax(280px,0.82fr)_minmax(0,1.18fr)]">
      <aside className="relative hidden overflow-hidden bg-inverse text-inverse-fg lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-10">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(520px 280px at 12% 0%, rgb(var(--accent) / 0.35), transparent 60%), radial-gradient(420px 240px at 100% 100%, rgb(34 197 94 / 0.16), transparent 55%)",
          }}
        />
        <Link href="/" className="relative flex items-center gap-3">
          <LogoMark size="sm" onDark />
          <Wordmark onDark />
        </Link>
        <div className="relative max-w-md">
          <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-inverse-fg/55">Your workspace</p>
          <h1 className="mt-3 font-display text-[2.4rem] font-semibold leading-[1.12] tracking-tight">
            Sign in and pick up where the inbox left off.
          </h1>
          <ul className="mt-8 space-y-4">
            {STEPS.map((step) => (
              <li key={step.n} className="flex gap-3">
                <span className="mt-0.5 font-display text-[12px] font-bold tracking-[0.14em] text-accent">{step.n}</span>
                <span>
                  <span className="block text-[15px] font-semibold">{step.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-inverse-fg/65">{step.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[13px] text-inverse-fg/55">Basic is free. No card required.</p>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-5 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-3 lg:invisible">
            <LogoMark size="sm" />
            <Wordmark />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/docs" className="text-[14px] font-semibold text-ink-muted transition hover:text-night">
              Docs
            </Link>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-5 pb-6 sm:px-8">
          <div className="w-full max-w-[420px]">
            <h2 className="font-display text-[1.7rem] font-semibold tracking-tight text-night">
              {mode === "signup" ? "Create your account" : "Sign in"}
            </h2>
            <p className="mt-1 text-[14px] leading-snug text-ink-muted">
              {mode === "signup"
                ? "Email and password, or Google. Basic is free."
                : "Email or Google. Basic is free, no card required."}
            </p>

            {errorKey ? (
              <p className="mt-5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3.5 py-2.5 text-[14px] text-rose-700">
                {ERROR_MESSAGES[errorKey] ?? "Sign-in failed. Please try again."}
              </p>
            ) : null}

            <a
              href={loginUrl}
              className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl border border-ink/10 bg-paper-elevated px-4 py-2.5 text-[15px] font-semibold text-night shadow-sm transition hover:border-ink/20"
            >
              <GoogleGlyph />
              Continue with Google
            </a>

            <div className="my-4 flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              <span className="h-px flex-1 bg-ink/10" />
              or email
              <span className="h-px flex-1 bg-ink/10" />
            </div>

            <EmailAuthForm next={next} mode={mode} onMode={setMode} />

            <p className="mt-4 text-center text-[13px] text-ink-muted">
              <Link href="/" className="font-semibold transition hover:text-night">
                Back to home
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

function EmailAuthForm({
  next,
  mode,
  onMode,
}: {
  next: string;
  mode: "login" | "signup";
  onMode: (mode: "login" | "signup") => void;
}) {
  const router = useRouter();
  const { applyToken } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const path = mode === "signup" ? "/api/v1/auth/signup" : "/api/v1/auth/login";
    const res = await apiFetch<{ token: string }>(path, {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        ...(mode === "signup" ? { name } : {}),
      }),
    });
    if (!res.success || !res.data?.token) {
      setError(res.success ? "Sign-in failed. Please try again." : res.message);
      setBusy(false);
      return;
    }
    const ok = await applyToken(res.data.token);
    if (!ok) {
      setError("Signed in, but the session could not be verified.");
      setBusy(false);
      return;
    }
    router.replace(next.startsWith("/") ? next : "/dashboard");
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
      <div className="grid grid-cols-2 rounded-xl border border-ink/10 bg-paper-elevated p-1 text-[13px] font-semibold">
        <button
          type="button"
          onClick={() => {
            onMode("login");
            setError(null);
          }}
          className={`rounded-lg px-3 py-2 transition ${mode === "login" ? "bg-inverse text-inverse-fg" : "text-ink-muted hover:text-night"}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            onMode("signup");
            setError(null);
          }}
          className={`rounded-lg px-3 py-2 transition ${mode === "signup" ? "bg-inverse text-inverse-fg" : "text-ink-muted hover:text-night"}`}
        >
          Create account
        </button>
      </div>

      {mode === "signup" ? (
        <Field label="Name">
          <input
            className="input-field !rounded-xl !py-2.5"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            placeholder="Your name"
          />
        </Field>
      ) : null}

      <Field label="Email">
        <input
          className="input-field !rounded-xl !py-2.5"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder="you@company.com"
        />
      </Field>
      <Field label="Password">
        <input
          className="input-field !rounded-xl !py-2.5"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
        />
      </Field>

      {error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3.5 py-2.5 text-[14px] text-rose-700">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center rounded-xl bg-inverse px-4 py-2.5 text-[15px] font-semibold text-inverse-fg transition hover:bg-inverse/90 disabled:opacity-60"
      >
        {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
