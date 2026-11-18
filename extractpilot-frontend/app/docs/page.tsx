"use client";

import Link from "next/link";
import { LinkButton } from "@/components/ui/LinkButton";
import { LogoMark, Wordmark } from "@/components/brand/LogoMark";
import { useAuth } from "@/providers/AuthProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "quickstart", label: "Quick start" },
  { id: "mailboxes", label: "Mailboxes" },
  { id: "prompts", label: "Prompts & AI models" },
  { id: "extract", label: "Run extraction" },
  { id: "results", label: "Results & confidence" },
  { id: "integrations", label: "Connect your tools" },
  { id: "plans", label: "Plans & limits" },
  { id: "api", label: "API reference" },
  { id: "faq", label: "FAQ" },
];

const QUICK_STEPS = [
  {
    title: "Sign in with Google",
    body: "Click Start free. We create a private workspace tied to your account — no credit card.",
  },
  {
    title: "Connect at least one mailbox",
    body: "Open Mailboxes and add an agent or ISA Gmail with an App Password. You can add more later.",
  },
  {
    title: "Activate a real-estate prompt",
    body: "In Prompts, pick Buyer leads (or another template), choose classify + extract models, Save & activate.",
  },
  {
    title: "Run Get started → Extract",
    body: "Choose a short lookback window, run extraction, then open Results to review structured fields.",
  },
];

const PROMPT_PACK = [
  "Buyer leads",
  "Seller & listing intake",
  "Showing & tour requests",
  "Offer & LOI terms",
  "Closing & escrow updates",
  "Tenant & maintenance",
];

const FAQ = [
  {
    q: "Do I need to reconnect Google every time I open Plans?",
    a: "No. Once signed in, stay in the dashboard Plans page to upgrade. Public /pricing also detects your session and keeps you logged in.",
  },
  {
    q: "Can each agent have their own Gmail?",
    a: "Yes. Add multiple mailboxes, then set one as Active before you extract. Managers can demo ISA + listing agent inboxes in the same workspace.",
  },
  {
    q: "What if an AI model is unavailable?",
    a: "Unavailable models are marked in the picker. ExtractPilot automatically falls back to a working default on your plan.",
  },
  {
    q: "How do confidence scores work?",
    a: "Each classification includes a confidence value so staff know what to double-check before CRM entry.",
  },
  {
    q: "Is checkout required for a demo?",
    a: "No. Start free and use the console. Paid plans unlock higher weekly email volume and more AI models when billing is enabled.",
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

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-ink/[0.08] bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark size="sm" />
            <Wordmark subtitle="Documentation" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LinkButton href={startHref} variant="accent" size="sm">
              {signedIn ? "Open workspace" : "Start free"}
            </LinkButton>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[220px_1fr] lg:py-16">
        <aside className="hidden lg:block">
          <nav className="sticky top-28 space-y-1">
            <p className="mb-3 px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-faint">On this page</p>
            {TOC.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block rounded-xl px-3 py-2 text-[14px] font-medium text-ink-muted transition hover:bg-ink/[0.04] hover:text-night"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 space-y-16">
          <section id="overview" className="scroll-mt-28">
            <p className="section-label-accent">ExtractPilot docs</p>
            <h1 className="page-title">How brokerages run ExtractPilot end to end.</h1>
            <p className="page-lede">
              This guide is for managers, agents, and ops staff. Follow it once and you&apos;ll know how to connect
              inboxes, pick AI models, extract deals from email, and push clean data into Slack or your CRM.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LinkButton href={startHref} variant="accent">
                {signedIn ? "Open workspace" : "Start free"}
              </LinkButton>
              <LinkButton href={toolsHref} variant="secondary">
                Connect tools
              </LinkButton>
            </div>
          </section>

          <section id="quickstart" className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-night">Quick start (about 10 minutes)</h2>
            <p className="mt-2 text-[16px] text-ink-muted">
              Use this path for a live demo with a manager in the room.
            </p>
            <ol className="mt-6 space-y-4">
              {QUICK_STEPS.map((step, i) => (
                <li key={step.title} className="saas-card flex gap-4 p-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
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
            <h2 className="text-2xl font-bold text-night">Mailboxes (multi-Gmail)</h2>
            <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-ink-muted">
              <p>
                Go to <strong className="text-night">Mailboxes</strong> in the sidebar. Add each inbox your team uses —
                ISA desk, listing agents, transaction coordinators, property management.
              </p>
              <p>
                For Google accounts, create an{" "}
                <strong className="text-night">App Password</strong> (2FA required) and paste it when connecting. Outlook
                / IMAP presets are available for office mail.
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

          <section id="prompts" className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-night">Prompts & AI models</h2>
            <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-ink-muted">
              <p>
                A prompt tells ExtractPilot <em>what</em> to look for and which JSON fields to return. Start with the
                real-estate pack, then customize.
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {PROMPT_PACK.map((name) => (
                  <li key={name} className="rounded-xl border border-ink/[0.07] bg-paper-elevated px-4 py-3 text-[14px] font-medium text-night">
                    {name}
                  </li>
                ))}
              </ul>
              <p>
                In Prompt studio you pick <strong className="text-night">classify</strong> and{" "}
                <strong className="text-night">extract</strong> models separately from 50+ options (by plan). Search by
                name or provider. Unavailable models are disabled and we fall back automatically.
              </p>
              <p>
                Always <strong className="text-night">Save & activate</strong> the prompt you want the next extraction to
                use.
              </p>
            </div>
            <LinkButton href={promptsHref} variant="secondary" size="sm" className="mt-5">
              Open Prompts
            </LinkButton>
          </section>

          <section id="extract" className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-night">Run extraction</h2>
            <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-ink-muted">
              <p>
                Open <strong className="text-night">Get started</strong> (or Extract now in the top bar). Confirm mailbox
                + active prompt, choose a lookback window (start short for demos), then run.
              </p>
              <p>
                The worker fetches mail, classifies relevance, extracts fields, and stores results with source email
                context and attachment text when available.
              </p>
            </div>
          </section>

          <section id="results" className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-night">Results & confidence</h2>
            <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-ink-muted">
              <p>
                <strong className="text-night">Results</strong> shows structured JSON per email. Use confidence scores to
                decide what staff should review before CRM entry.
              </p>
              <p>
                Low-confidence or failed items can go to the <strong className="text-night">Review queue</strong> for
                human correction. Original subject, sender, and body stay attached so nothing is a black box.
              </p>
            </div>
          </section>

          <section id="integrations" className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-night">Connect your tools</h2>
            <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-ink-muted">
              <p>
                Open <strong className="text-night">Integrations</strong> to wire delivery after each extraction:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-night">Slack</strong> — paste an incoming webhook for channel alerts.
                </li>
                <li>
                  <strong className="text-night">Customer webhook</strong> — Zapier Catch Hook, Make, Follow Up Boss,
                  HubSpot, Salesforce, or your own HTTPS endpoint.
                </li>
                <li>
                  Toggle notify on completed / failed so ops only gets the events they want.
                </li>
              </ul>
            </div>
            <pre className="code-block mt-5 overflow-x-auto text-[12px]">{`{
  "event": "extraction.completed",
  "emailId": "...",
  "subject": "New buyer inquiry — 412 Maple",
  "extracted": { "buyer_name": "...", "budget": 650000 },
  "confidence": 0.91
}`}</pre>
            <LinkButton href={toolsHref} variant="secondary" size="sm" className="mt-5">
              Open Integrations
            </LinkButton>
          </section>

          <section id="plans" className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-night">Plans & limits</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[14px]">
                <thead>
                  <tr className="border-b border-ink/10 text-ink-muted">
                    <th className="py-3 font-semibold">Plan</th>
                    <th className="py-3 font-semibold">Email volume</th>
                    <th className="py-3 font-semibold">AI models</th>
                    <th className="py-3 font-semibold">Best for</th>
                  </tr>
                </thead>
                <tbody className="text-night">
                  <tr className="border-b border-ink/5">
                    <td className="py-3 font-semibold">Starter</td>
                    <td className="py-3 text-ink-muted">Demo / light use</td>
                    <td className="py-3 text-ink-muted">10+ fast models</td>
                    <td className="py-3 text-ink-muted">First workspace</td>
                  </tr>
                  <tr className="border-b border-ink/5">
                    <td className="py-3 font-semibold">Team</td>
                    <td className="py-3 text-ink-muted">1,000 / week</td>
                    <td className="py-3 text-ink-muted">20+ models</td>
                    <td className="py-3 text-ink-muted">Busy sales floor</td>
                  </tr>
                  <tr className="border-b border-ink/5">
                    <td className="py-3 font-semibold">Business</td>
                    <td className="py-3 text-ink-muted">5,000 / week</td>
                    <td className="py-3 text-ink-muted">35+ models</td>
                    <td className="py-3 text-ink-muted">Multi-office ops</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold">Enterprise</td>
                    <td className="py-3 text-ink-muted">20,000 / week</td>
                    <td className="py-3 text-ink-muted">Full 50+ catalog</td>
                    <td className="py-3 text-ink-muted">Brokerage-wide</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-[15px] text-ink-muted">
              Manage upgrades from dashboard <strong className="text-night">Plans</strong> while signed in. Optional{" "}
              <strong className="text-night">Connect your workspace</strong> is a one-time white-glove setup add-on.
            </p>
          </section>

          <section id="api" className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-night">API reference (developers)</h2>
            <p className="mt-2 text-[16px] text-ink-muted">
              Authenticate with your Google session in the console, or an API key from Settings for scripts. Responses
              use a <code className="rounded bg-ink/5 px-1 text-[13px]">success / message / data</code> envelope.
            </p>
            <ol className="mt-6 space-y-3">
              {[
                { method: "PATCH", path: "/api/v1/integrations", desc: "Save webhook + Slack URLs" },
                { method: "POST", path: "/api/v1/user-query", desc: "Create prompt + output schema" },
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
            <h2 className="text-2xl font-bold text-night">FAQ</h2>
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
            <p className="section-label !text-white/50">Ready</p>
            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">Start free and walk the flow live.</h2>
            <p className="mt-3 max-w-xl text-[16px] text-white/70">
              Sign in, connect two Gmails, activate Buyer leads, extract, then show Results + Integrations to the room.
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
          </section>
        </main>
      </div>
    </div>
  );
}
