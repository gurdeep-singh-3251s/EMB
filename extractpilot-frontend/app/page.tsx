import { LinkButton } from "@/components/ui/LinkButton";
import { BetaNoticePanel } from "@/components/layout/BetaBanner";
import { BETA_LAUNCH_LABEL } from "@repo/config/plans";

const features = [
  {
    title: "Multi-provider IMAP",
    body: "Gmail, Outlook, Zoho, Yahoo, iCloud, or any IMAP server — connect once and extract at scale.",
  },
  {
    title: "Custom extraction schema",
    body: "Define exactly which fields your business needs — invoices, orders, metadata, arrays, objects.",
  },
  {
    title: "Integrate via REST",
    body: "Customer-facing integration guide in the console — embed extraction in your own backend without Swagger.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="animate-fade-in-down border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white shadow-premium">
              EP
            </div>
            <span className="font-display text-base font-bold text-slate-950">ExtractPilot</span>
          </div>
          <div className="flex items-center gap-2.5">
            <LinkButton href="/pricing" variant="secondary" size="sm">
              Pricing
            </LinkButton>
            <LinkButton href="/login" variant="accent" size="sm">
              Sign in
            </LinkButton>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200 bg-[rgb(var(--surface-muted))]">
        <div className="absolute inset-0 bg-grid-light bg-grid opacity-60" />
        <div className="relative mx-auto max-w-6xl px-5 py-16 lg:py-20">
          <p className="section-label animate-fade-in-up">Closed beta · Invite-only · {BETA_LAUNCH_LABEL}</p>
          <h1 className="mt-3 max-w-3xl animate-fade-in-up stagger-1 font-display text-4xl font-extrabold tracking-tight text-slate-950 lg:text-5xl">
            Turn inbox chaos into structured business data.
          </h1>
          <p className="mt-4 max-w-2xl animate-fade-in-up stagger-2 text-base leading-relaxed text-slate-600 lg:text-lg">
            ExtractPilot connects to any business mailbox over IMAP, classifies relevant messages,
            parses attachments, and returns schema-aligned JSON your teams and systems can trust.
            Currently available to selected testers for real-world evaluation.
          </p>
          <div className="mt-5 max-w-2xl animate-fade-in-up stagger-3">
            <BetaNoticePanel />
          </div>
          <div className="mt-7 flex flex-wrap gap-3 animate-fade-in-up stagger-4">
            <LinkButton href="/dashboard/workflow?step=1" variant="accent" size="lg">
              Open beta console
            </LinkButton>
            <LinkButton href="/dashboard/developers" variant="secondary" size="lg">
              Integration guide
            </LinkButton>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              ["Invite-only", "Selected beta testers", "stagger-3"],
              ["Unlimited beta", "No email caps while testing", "stagger-4"],
              ["REST API", "Bearer key auth for your backend", "stagger-5"],
            ].map(([value, label, stagger]) => (
              <div
                key={label}
                className={`glass-panel-interactive p-4 animate-fade-in-up ${stagger}`}
              >
                <p className="metric-value">{value}</p>
                <p className="mt-0.5 text-sm text-slate-600">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <p className="section-label animate-fade-in-up">Platform capabilities</p>
        <h2 className="mt-2 animate-fade-in-up stagger-1 font-display text-2xl font-bold text-slate-950 lg:text-3xl">
          Built for operations teams
        </h2>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {features.map((f, index) => {
            const stagger = ["stagger-2", "stagger-3", "stagger-4"][index] ?? "stagger-2";
            return (
              <article
                key={f.title}
                className={`glass-panel-interactive p-5 animate-fade-in-up ${stagger}`}
              >
                <h3 className="font-display text-base font-semibold text-slate-950">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-950 px-5 py-8 text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm">ExtractPilot · AI email extraction for modern businesses</p>
          <LinkButton href="/dashboard" variant="inverse" size="sm">
            Go to console →
          </LinkButton>
        </div>
      </footer>
    </div>
  );
}
