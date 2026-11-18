"use client";

import Link from "next/link";
import { LinkButton } from "@/components/ui/LinkButton";
import { LogoMark, Wordmark } from "@/components/brand/LogoMark";
import { useAuth } from "@/providers/AuthProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const STEPS = [
  {
    title: "1. Sign in & create a workspace",
    body: "Google sign-in creates a private brokerage workspace. No credit card for the free tier.",
  },
  {
    title: "2. Connect Gmail / Outlook mailboxes",
    body: "Add multiple agent, ISA, and TC inboxes. Set one as active before you extract.",
  },
  {
    title: "3. Load a real-estate prompt",
    body: "Use buyer leads, seller intake, showings, offers, or escrow templates — or define your own JSON schema.",
  },
  {
    title: "4. Push results into your tools",
    body: "Send extraction.completed events to Slack, Zapier, Make, Follow Up Boss, HubSpot, or any webhook your CRM accepts.",
  },
];

const API_FLOW = [
  { method: "PATCH", path: "/api/v1/integrations", desc: "Save customer webhook + Slack URLs" },
  { method: "POST", path: "/api/v1/user-query", desc: "Create extraction query + output schema" },
  { method: "POST", path: "/api/v1/mailboxes", desc: "Connect multi-mailbox IMAP / Gmail" },
  { method: "POST", path: "/api/v1/mailbox/extract-emails", desc: "Fetch mail and run extraction" },
  { method: "GET", path: "/api/v1/user-query/current/results", desc: "Read structured results + confidence" },
];

export default function DocsPage() {
  const { user, loading } = useAuth();
  const signedIn = Boolean(user);
  const consoleHref = signedIn ? "/dashboard/developers" : "/login?next=/dashboard/developers";
  const toolsHref = signedIn ? "/dashboard/integrations" : "/login?next=/dashboard/integrations";

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-ink/10 px-6 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark size="sm" />
            <Wordmark subtitle="Docs" />
          </Link>
          <div className="flex gap-2">
            <ThemeToggle />
            <LinkButton href="/pricing" variant="ghost" size="sm">
              Pricing
            </LinkButton>
            {loading ? null : (
              <LinkButton href={signedIn ? "/dashboard" : "/login?next=/dashboard"} variant="primary" size="sm">
                {signedIn ? "Open workspace" : "Start for free"}
              </LinkButton>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-14">
        <p className="section-label-accent">Integration guide</p>
        <h1 className="page-title">How to integrate ExtractPilot with your brokerage stack.</h1>
        <p className="page-lede">
          Start in the console, or wire REST + webhooks so leads and escrow updates land in the tools your agents already
          live in.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton href={toolsHref} variant="accent" size="lg">
            Connect your tools
          </LinkButton>
          <LinkButton href={consoleHref} variant="secondary" size="lg">
            Full API reference
          </LinkButton>
        </div>

        <section className="mt-14 grid gap-4 md:grid-cols-2">
          {STEPS.map((step) => (
            <article key={step.title} className="saas-card p-6">
              <h2 className="text-lg font-bold text-night">{step.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{step.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-bold text-night">REST flow (for developers)</h2>
          <p className="mt-2 max-w-2xl text-[15px] text-ink-muted">
            Authenticate with your workspace session or an API key from Settings. Every response uses a{" "}
            <code className="rounded bg-ink/5 px-1 text-[13px]">success / message / data</code> envelope.
          </p>
          <ol className="mt-6 space-y-3">
            {API_FLOW.map((step, i) => (
              <li key={step.path} className="saas-card p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Step {i + 1}</p>
                <p className="mt-1 font-mono text-[14px] text-night">
                  <span className="font-bold text-accent">{step.method}</span> {step.path}
                </p>
                <p className="mt-1 text-[14px] text-ink-muted">{step.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14 saas-card p-6 md:p-8">
          <h2 className="text-xl font-bold text-night">Webhook payload</h2>
          <p className="mt-2 text-[15px] text-ink-muted">
            After an extraction finishes we POST JSON to your customer webhook (and optionally Slack). Point Zapier /
            Make / your CRM listener at that URL.
          </p>
          <pre className="code-block mt-5 overflow-x-auto text-[12px]">{`{
  "event": "extraction.completed",
  "emailId": "...",
  "subject": "New buyer inquiry — 412 Maple",
  "extracted": { "buyer_name": "...", "budget": 650000 },
  "confidence": 0.91
}`}</pre>
        </section>
      </main>
    </div>
  );
}
