"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { restClient } from "@/lib/restClient";
import { emailApiProvider } from "@/apiProvider/email/emailApiProvider";
import { Panel } from "@/components/ui/Panel";
import { LinkButton } from "@/components/ui/LinkButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";

export default function DashboardOverviewPage() {
  const [mailbox, setMailbox] = useState<{ configured: boolean; user: string | null } | null>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [recent, setRecent] = useState(0);

  useEffect(() => {
    void (async () => {
      const [mb, uq, emailStats, results] = await Promise.all([
        restClient.mailbox.config(),
        restClient.userQuery.current(),
        emailApiProvider.stats(),
        restClient.userQuery.results({ limit: 5, includeInProgress: true }),
      ]);

      if (mb.success) setMailbox({ configured: mb.data.configured, user: mb.data.user });
      if (uq.success && uq.data) setQuery(uq.data.userQuery.slice(0, 80));
      if (emailStats.success) setStats(emailStats.data);
      if (results.success) setRecent(results.data.total);
    })();
  }, []);

  const pipelineStep = !query ? 1 : !mailbox?.configured ? 2 : 3;
  const steps = [
    { done: !!query, label: "Write your extraction schema", step: 1 },
    { done: mailbox?.configured, label: "Connect multiple mailboxes", step: 2 },
    { done: (stats?.completed ?? 0) > 0, label: "Confirm first results", step: 3 },
  ];

  const onboarding = [
    { done: !!query, label: "Describe what to extract (Prompt studio)", href: "/dashboard/prompts" },
    {
      done: Boolean(mailbox?.configured),
      label: "Connect your mailboxes (Gmail, Outlook, IMAP…)",
      href: "/dashboard/mailboxes",
    },
    { done: (stats?.completed ?? 0) > 0, label: "Run extract and reclaim hours this week", href: "/dashboard/workflow?step=3" },
  ];

  return (
    <div className="space-y-6">
      <div data-reveal>
        <OnboardingChecklist steps={onboarding} />
      </div>
      <div data-reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label">Today</p>
          <h1 className="page-title !mt-1.5">Automate workflows across every inbox</h1>
          <p className="page-lede">
            Connect multiple mailboxes, extract structured data from anyone who emails you, and keep ops moving —
            without copying fields by hand. First setup takes about 10 minutes.
          </p>
        </div>
        <LinkButton href={`/dashboard/workflow?step=${pipelineStep}`} variant="accent">
          {stats?.completed ? "Open pipeline" : "Continue setup"}
        </LinkButton>
      </div>

      <div data-reveal className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Ingested", stats?.total ?? "—"],
          ["Extracted", stats?.completed ?? "—"],
          ["Needs attention", stats?.failed ?? "—"],
          ["Rows in results", recent],
        ].map(([label, value]) => (
          <div key={String(label)} className="ledger-panel-interactive p-4">
            <p className="section-label">{label}</p>
            <p className="metric-value mt-1.5">{value}</p>
          </div>
        ))}
      </div>

      <div data-reveal className="grid gap-4 lg:grid-cols-2">
        <Panel title="Checklist" description="Same three steps as the pipeline — no duplicate wizards">
          <ul className="space-y-2">
            {steps.map((step) => (
              <li key={step.label}>
                <Link
                  href={`/dashboard/workflow?step=${step.step}`}
                  className="flex items-center justify-between rounded-lg border border-ink/10 px-3.5 py-2.5 transition hover:border-ink/20 hover:bg-paper-elevated"
                >
                  <span className="text-sm font-medium text-ink">{step.label}</span>
                  <StatusBadge status={step.done ? "completed" : "pending"} />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Workspace snapshot">
          {query ? (
            <p className="rounded-lg border border-ink/10 bg-paper-elevated p-3 text-sm text-ink-muted">
              <span className="font-semibold text-ink">Active schema intent:</span> {query}
              {query.length >= 80 ? "…" : ""}
            </p>
          ) : (
            <p className="text-sm text-ink-muted">No schema saved yet — start with step 1 in the pipeline.</p>
          )}
          {mailbox?.configured ? (
            <p className="mt-2 text-sm text-ink-muted">
              <span className="font-semibold text-ink">Mailbox:</span> {mailbox.user}
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">No mailbox connected.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <LinkButton href="/dashboard/results" variant="secondary" size="sm">
              Results table
            </LinkButton>
            <LinkButton href="/dashboard/developers" variant="secondary" size="sm">
              API guide
            </LinkButton>
          </div>
        </Panel>
      </div>
    </div>
  );
}
