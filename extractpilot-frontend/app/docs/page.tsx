"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LinkButton } from "@/components/ui/LinkButton";
import { LogoMark, Wordmark } from "@/components/brand/LogoMark";
import { useAuth } from "@/providers/AuthProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "who", label: "Who it's for" },
  { id: "quickstart", label: "Quick start" },
  { id: "mailboxes", label: "Mailboxes" },
  { id: "requirements", label: "Requirements & AI" },
  { id: "extract", label: "Run extraction" },
  { id: "results", label: "Results & confidence" },
  { id: "integrations", label: "Connect your tools" },
  { id: "plans", label: "Plans & limits" },
  { id: "api", label: "API reference" },
  { id: "faq", label: "FAQ" },
];

const AUDIENCES = [
  {
    title: "Business leaders & ops",
    body: "Turn shared inboxes into dashboards of structured work — no more copy-paste into spreadsheets.",
  },
  {
    title: "Sales & account teams",
    body: "Pull leads, deal terms, and follow-ups from hundreds of emails into your CRM automatically.",
  },
  {
    title: "Ecommerce & marketplace sellers",
    body: "Extract orders, returns, supplier updates, and customer issues from daily mail volume.",
  },
  {
    title: "Customer support & offices",
    body: "Classify tickets, pull case fields from attachments, and route clean JSON to helpdesk tools.",
  },
];

const QUICK_STEPS = [
  {
    title: "Sign in with Google",
    body: "Click Start free. We create a private workspace for your account — no credit card.",
  },
  {
    title: "Connect at least one mailbox",
    body: "Open Mailboxes and add a Gmail or Outlook/IMAP inbox with an App Password. Add more team inboxes anytime.",
  },
  {
    title: "Write your requirements",
    body: "Describe what to extract in plain language (or open a starter template), set output fields, Save & activate.",
  },
  {
    title: "Run Extract Now",
    body: "Choose a short lookback window, run extraction, then open Results to review structured fields + confidence.",
  },
];

const TEMPLATE_EXAMPLES = [
  "Inbound leads & inquiries",
  "Vendor invoices (AP)",
  "Orders & shipping updates",
  "Support tickets",
  "Contracts & clearances",
  "Custom — write your own",
];

const FAQ = [
  {
    q: "Do I need to sign in again to upgrade a plan?",
    a: "No. Once signed in, use dashboard Plans. Public /pricing also keeps your session if you're already logged in.",
  },
  {
    q: "Can I connect multiple Gmail or Outlook accounts?",
    a: "Yes. Add as many mailboxes as you need (sales, support, orders, personal), then set one as Active before you extract.",
  },
  {
    q: "What if an AI model is unavailable?",
    a: "Unavailable models are marked in the picker. ExtractPilot automatically falls back to a working default on your plan.",
  },
  {
    q: "How do confidence scores work?",
    a: "Each classification includes a confidence value so your team knows what to double-check before CRM or helpdesk entry.",
  },
  {
    q: "Is this only for one industry?",
    a: "No. ExtractPilot is for anyone drowning in email — sales, ecommerce, support, offices, agencies, and ops teams. Templates are optional starters; you write your own requirements.",
  },
];

export default function DocsPage() {
  const { user, loading } = useAuth();
  const signedIn = Boolean(user);
  const startHref = signedIn ? "/dashboard" : "/login?next=/dashboard";
  const mailboxesHref = signedIn ? "/dashboard/mailboxes" : "/login?next=/dashboard/mailboxes";
  const promptsHref = signedIn ? "/dashboard/prompts" : "/login?next=/dashboard/prompts";
  const toolsHref = signedIn ? "/dashboard/integrations" : "/login?next=/dashboard/integrations";
  const apiHref = signedIn ? "/dashboard/developers" : "/login?next=/dashboard/developers";
  const [activeId, setActiveId] = useState("overview");

  useEffect(() => {
    const nodes = TOC.map((item) => document.getElementById(item.id)).filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.35, 0.6] },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="marketing-shell">
      <header className="marketing-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark size="sm" />
            <Wordmark subtitle="Documentation" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LinkButton href="/pricing" variant="ghost" size="sm">
              Pricing
            </LinkButton>
            <LinkButton href={startHref} variant="accent" size="sm">
              {signedIn ? "Open workspace" : "Start free"}
            </LinkButton>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[230px_1fr] lg:py-16">
        <aside className="hidden lg:block">
          <nav className="sticky top-28 space-y-1 rounded-3xl border border-ink/[0.06] bg-paper-elevated/70 p-3 shadow-premium backdrop-blur-xl">
            <p className="mb-2 px-3 pt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              On this page
            </p>
            {TOC.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`docs-toc-link ${
                  activeId === item.id
                    ? "bg-inverse font-semibold text-inverse-fg shadow-sm hover:bg-inverse hover:text-inverse-fg"
                    : ""
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 space-y-16">
          <section id="overview" className="scroll-mt-28">
            <div className="relative overflow-hidden rounded-[2rem] border border-ink/[0.07] bg-paper-elevated/80 p-8 shadow-premium sm:p-10">
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/15 blur-3xl"
                aria-hidden
              />
              <p className="section-label-accent">ExtractPilot docs</p>
              <h1 className="page-title !mt-3 font-display">Automate your email workflow — end to end.</h1>
              <p className="page-lede">
                Built for anyone who gets dozens or hundreds of emails a day. Connect inboxes, describe what you need in
                plain language, extract structured data (including attachments), and push results into Slack, Zapier, or
                your CRM.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <LinkButton href={startHref} variant="accent">
                  {signedIn ? "Open workspace" : "Start free"}
                </LinkButton>
                <LinkButton href={toolsHref} variant="secondary">
                  Connect tools
                </LinkButton>
              </div>
            </div>
          </section>

          <section id="who" className="scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-night">Who it&apos;s for</h2>
            <p className="mt-2 text-[16px] text-ink-muted">
              Same product for every team — only your requirements and schema change.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {AUDIENCES.map((item) => (
                <article key={item.title} className="saas-card p-5 transition hover:-translate-y-0.5 hover:shadow-ledger-lg">
                  <h3 className="font-display font-bold text-night">{item.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="quickstart" className="scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-night">Quick start (about 10 minutes)</h2>
            <p className="mt-2 text-[16px] text-ink-muted">
              From empty workspace to structured results — no engineering required.
            </p>
            <ol className="mt-6 space-y-4">
              {QUICK_STEPS.map((step, i) => (
                <li key={step.title} className="saas-card flex gap-4 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft font-display text-sm font-bold text-accent">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-bold text-night">{step.title}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section id="mailboxes" className="scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-night">Mailboxes (multi-inbox)</h2>
            <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-ink-muted">
              <p>
                Go to <strong className="text-night">Mailboxes</strong> in the sidebar. Add every inbox you want to
                automate — sales, support, orders, vendors, or a personal work Gmail.
              </p>
              <p>
                For Google accounts, create an{" "}
                <strong className="text-night">App Password</strong> (2FA required) and paste it when connecting. Outlook
                / IMAP presets cover most office mail.
              </p>
              <p>
                Only one mailbox is <strong className="text-night">Active</strong> at a time. Switch active before you
                extract so the pipeline reads the right inbox.
              </p>
            </div>
            <LinkButton href={mailboxesHref} variant="secondary" size="sm" className="mt-5">
              Open Mailboxes
            </LinkButton>
          </section>

          <section id="requirements" className="scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-night">Requirements & AI models</h2>
            <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-ink-muted">
              <p>
                Tell ExtractPilot <em>what</em> to pull from each email (and attachments) in plain language, then define
                the JSON fields you want back. Optional starters help if you&apos;re stuck — or write your own.
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {TEMPLATE_EXAMPLES.map((name) => (
                  <li
                    key={name}
                    className="rounded-2xl border border-ink/[0.07] bg-paper-elevated/90 px-4 py-3 text-[14px] font-medium text-night shadow-sm"
                  >
                    {name}
                  </li>
                ))}
              </ul>
              <p>
                Pick <strong className="text-night">classify</strong> and <strong className="text-night">extract</strong>{" "}
                models separately from 50+ options (by plan). Unavailable models are disabled and we fall back
                automatically. Always <strong className="text-night">Save & activate</strong> before the next run.
              </p>
            </div>
            <LinkButton href={promptsHref} variant="secondary" size="sm" className="mt-5">
              Open requirements / prompts
            </LinkButton>
          </section>

          <section id="extract" className="scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-night">Run extraction</h2>
            <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-ink-muted">
              <p>
                Open <strong className="text-night">Get started</strong> (or Extract Now in the top bar). Confirm mailbox
                + active requirements, choose a lookback window (start short), then run.
              </p>
              <p>
                The worker fetches mail, classifies relevance, extracts fields, and stores results with source email
                context and attachment text when available — useful when invoices, forms, or clearances arrive as PDFs.
              </p>
            </div>
          </section>

          <section id="results" className="scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-night">Results & confidence</h2>
            <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-ink-muted">
              <p>
                <strong className="text-night">Results</strong> shows structured JSON per email. Use confidence scores to
                decide what humans should review before CRM, ERP, or helpdesk entry.
              </p>
              <p>
                Low-confidence or failed items go to the <strong className="text-night">Review queue</strong>. Original
                subject, sender, and body stay attached so nothing is a black box.
              </p>
            </div>
          </section>

          <section id="integrations" className="scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-night">Connect your tools</h2>
            <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-ink-muted">
              <p>
                Open <strong className="text-night">Integrations</strong> to deliver data after each extraction:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-night">Slack</strong> — channel alerts via incoming webhook.
                </li>
                <li>
                  <strong className="text-night">Customer webhook</strong> — Zapier, Make, HubSpot, Salesforce, Shopify
                  flows, or your own HTTPS endpoint.
                </li>
                <li>Toggle notify on completed / failed so teams only get the events they want.</li>
              </ul>
            </div>
            <pre className="code-block mt-5 overflow-x-auto text-[12px]">{`{
  "event": "extraction.completed",
  "emailId": "...",
  "subject": "Order #18420 — payment confirmed",
  "extracted": { "order_id": "18420", "total": 129.5, "customer_email": "…" },
  "confidence": 0.91
}`}</pre>
            <LinkButton href={toolsHref} variant="secondary" size="sm" className="mt-5">
              Open Integrations
            </LinkButton>
          </section>

          <section id="plans" className="scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-night">Plans & limits</h2>
            <div className="mt-4 overflow-x-auto rounded-3xl border border-ink/[0.07] bg-paper-elevated/90 shadow-premium">
              <table className="w-full min-w-[520px] text-left text-[14px]">
                <thead>
                  <tr className="border-b border-ink/10 bg-ink/[0.02] text-ink-muted">
                    <th className="px-5 py-3.5 font-semibold">Plan</th>
                    <th className="px-5 py-3.5 font-semibold">Email volume</th>
                    <th className="px-5 py-3.5 font-semibold">AI models</th>
                    <th className="px-5 py-3.5 font-semibold">Best for</th>
                  </tr>
                </thead>
                <tbody className="text-night">
                  <tr className="border-b border-ink/5">
                    <td className="px-5 py-3.5 font-semibold">Starter</td>
                    <td className="px-5 py-3.5 text-ink-muted">Demo / light use</td>
                    <td className="px-5 py-3.5 text-ink-muted">10+ fast models</td>
                    <td className="px-5 py-3.5 text-ink-muted">Trying the flow</td>
                  </tr>
                  <tr className="border-b border-ink/5">
                    <td className="px-5 py-3.5 font-semibold">Team</td>
                    <td className="px-5 py-3.5 text-ink-muted">1,000 / week</td>
                    <td className="px-5 py-3.5 text-ink-muted">20+ models</td>
                    <td className="px-5 py-3.5 text-ink-muted">Busy shared inboxes</td>
                  </tr>
                  <tr className="border-b border-ink/5">
                    <td className="px-5 py-3.5 font-semibold">Business</td>
                    <td className="px-5 py-3.5 text-ink-muted">5,000 / week</td>
                    <td className="px-5 py-3.5 text-ink-muted">35+ models</td>
                    <td className="px-5 py-3.5 text-ink-muted">Multi-team ops</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3.5 font-semibold">Enterprise</td>
                    <td className="px-5 py-3.5 text-ink-muted">20,000 / week</td>
                    <td className="px-5 py-3.5 text-ink-muted">Full 50+ catalog</td>
                    <td className="px-5 py-3.5 text-ink-muted">Company-wide mail</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-[15px] text-ink-muted">
              Manage upgrades from dashboard <strong className="text-night">Plans</strong>. Optional{" "}
              <strong className="text-night">Connect your workspace</strong> is a one-time setup add-on if you want a
              guided onboarding call.
            </p>
          </section>

          <section id="api" className="scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-night">API reference (developers)</h2>
            <p className="mt-2 text-[16px] text-ink-muted">
              Authenticate with your Google session in the console, or an API key from Settings for scripts. Responses
              use a <code className="rounded bg-ink/5 px-1 text-[13px]">success / message / data</code> envelope.
            </p>
            <ol className="mt-6 space-y-3">
              {[
                { method: "PATCH", path: "/api/v1/integrations", desc: "Save webhook + Slack URLs" },
                { method: "POST", path: "/api/v1/user-query", desc: "Create requirements + output schema" },
                { method: "POST", path: "/api/v1/mailboxes", desc: "Add IMAP / Gmail mailbox" },
                { method: "POST", path: "/api/v1/mailbox/extract-emails", desc: "Fetch + extract" },
                { method: "GET", path: "/api/v1/user-query/current/results", desc: "Read structured results" },
              ].map((step, i) => (
                <li key={step.path} className="saas-card p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Step {i + 1}</p>
                  <p className="mt-1 font-mono text-[14px] text-night">
                    <span className="font-bold text-accent">{step.method}</span> {step.path}
                  </p>
                  <p className="mt-1 text-[14px] text-ink-muted">{step.desc}</p>
                </li>
              ))}
            </ol>
            <LinkButton href={apiHref} variant="secondary" size="sm" className="mt-5">
              Open in-app API guide
            </LinkButton>
          </section>

          <section id="faq" className="scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-night">FAQ</h2>
            <div className="mt-6 space-y-4">
              {FAQ.map((item) => (
                <article key={item.q} className="saas-card p-5">
                  <h3 className="font-bold text-night">{item.q}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{item.a}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="saas-card-dark p-8 sm:p-10">
            <div className="relative z-10">
              <p className="section-label !text-white/50">Ready</p>
              <h2 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">
                Start free and automate your inbox.
              </h2>
              <p className="mt-3 max-w-xl text-[16px] text-white/70">
                Sign in, connect a mailbox, write requirements (or pick a template), extract, then wire Results into the
                tools you already use.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {!loading ? (
                  <LinkButton href={startHref} variant="accent" size="lg">
                    {signedIn ? "Open workspace" : "Start free"}
                  </LinkButton>
                ) : null}
                <LinkButton href="#quickstart" variant="inverse" size="lg">
                  Back to quick start
                </LinkButton>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
