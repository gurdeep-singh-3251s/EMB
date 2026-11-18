"use client";

import { useEffect, useState } from "react";
import { restClient } from "@/lib/restClient";
import { emailApiProvider } from "@/apiProvider/email/emailApiProvider";
import { Panel } from "@/components/ui/Panel";
import { LinkButton } from "@/components/ui/LinkButton";
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
      if (uq.success && uq.data) setQuery(uq.data.userQuery.slice(0, 100));
      if (emailStats.success) setStats(emailStats.data);
      if (results.success) setRecent(results.data.total);
    })();
  }, []);

  const ready = Boolean(query && mailbox?.configured);
  const pipelineStep = !query ? 1 : !mailbox?.configured ? 2 : 3;

  const onboarding = [
    {
      done: !!query,
      label: "Write down your requirements",
      detail: "Describe what to pull from email and which fields you need — then save & activate.",
      href: "/dashboard/prompts",
    },
    {
      done: Boolean(mailbox?.configured),
      label: "Connect your mailboxes",
      detail: "Add Gmail or IMAP inboxes. Extraction uses the active mailbox.",
      href: "/dashboard/mailboxes",
    },
    {
      done: (stats?.completed ?? 0) > 0,
      label: "Extract Now",
      detail: "Run extraction and review structured results with confidence scores.",
      href: "/dashboard/workflow?step=3",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div data-reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label">Home</p>
          <h1 className="page-title !mt-1.5">{ready ? "Your workspace" : "Welcome — let's set you up"}</h1>
          <p className="page-lede">
            {ready
              ? "Extract from any connected mailbox, review results, and keep ops moving without copy-paste."
              : "Three steps: write requirements, connect mailboxes, then Extract Now."}
          </p>
        </div>
        <LinkButton href={`/dashboard/workflow?step=${pipelineStep}`} variant="accent">
          {ready ? "Extract Now" : "Start setup"}
        </LinkButton>
      </div>

      <div data-reveal>
        <OnboardingChecklist steps={onboarding} />
      </div>

      <div data-reveal className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Emails ingested", stats?.total ?? "—"],
          ["Extracted", stats?.completed ?? "—"],
          ["Needs review", stats?.failed ?? "—"],
          ["Result rows", recent],
        ].map(([label, value]) => (
          <div key={String(label)} className="saas-card p-5">
            <p className="section-label">{label}</p>
            <p className="metric-value mt-2 text-[1.75rem]">{value}</p>
          </div>
        ))}
      </div>

      <div data-reveal className="grid gap-4 lg:grid-cols-2">
        <Panel title="Current setup" description="What the pipeline will use next time you extract">
          <dl className="space-y-4 text-[15px]">
            <div>
              <dt className="text-ink-muted">Active requirements</dt>
              <dd className="mt-1 font-medium text-night">
                {query ? (
                  <>
                    {query}
                    {query.length >= 100 ? "…" : ""}
                  </>
                ) : (
                  <span className="font-normal text-ink-muted">Not set yet</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Active mailbox</dt>
              <dd className="mt-1 font-medium text-night">
                {mailbox?.configured ? mailbox.user : <span className="font-normal text-ink-muted">Not connected</span>}
              </dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <LinkButton href="/dashboard/prompts" variant="secondary" size="sm">
              Edit requirements
            </LinkButton>
            <LinkButton href="/dashboard/mailboxes" variant="secondary" size="sm">
              Manage mailboxes
            </LinkButton>
          </div>
        </Panel>

        <Panel title="Quick actions" description="The only places most people need day to day">
          <div className="grid gap-2">
            <LinkButton href="/dashboard/workflow?step=3" variant="primary" className="!justify-start">
              Extract Now
            </LinkButton>
            <LinkButton href="/dashboard/results" variant="secondary" className="!justify-start">
              View results
            </LinkButton>
            <LinkButton href="/dashboard/review" variant="secondary" className="!justify-start">
              Review failures / partials
            </LinkButton>
            <LinkButton href="/dashboard/settings" variant="ghost" className="!justify-start">
              Webhooks & settings
            </LinkButton>
          </div>
        </Panel>
      </div>
    </div>
  );
}
