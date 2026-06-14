"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { restClient } from "@/lib/restClient";
import { emailApiProvider } from "@/apiProvider/email/emailApiProvider";
import { Panel } from "@/components/ui/Panel";
import { LinkButton } from "@/components/ui/LinkButton";
import { StatusBadge } from "@/components/ui/StatusBadge";

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
    { done: !!query, label: "Define extraction schema", step: 1 },
    { done: mailbox?.configured, label: "Connect mailbox (any IMAP)", step: 2 },
    { done: (stats?.completed ?? 0) > 0, label: "Review extraction results", step: 3 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 animate-fade-in-up">
        <div>
          <p className="section-label">Overview</p>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-slate-950 lg:text-3xl">
            Operations dashboard
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            One pipeline for setup, mailbox connection, and extraction — no duplicate flows.
          </p>
        </div>
        <LinkButton href={`/dashboard/workflow?step=${pipelineStep}`} variant="accent">
          {stats?.completed ? "Open pipeline" : "Continue setup"}
        </LinkButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total emails", stats?.total ?? "—", "stagger-1"],
          ["Completed", stats?.completed ?? "—", "stagger-2"],
          ["Failed", stats?.failed ?? "—", "stagger-3"],
          ["Query results", recent, "stagger-4"],
        ].map(([label, value, stagger]) => (
          <div
            key={String(label)}
            className={`glass-panel-interactive p-4 animate-fade-in-up ${stagger}`}
          >
            <p className="text-xs text-slate-500">{label}</p>
            <p className="metric-value mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Pipeline progress"
          description="All steps live in one guided workflow"
          className="animate-fade-in-up stagger-3"
        >
          <ul className="space-y-2">
            {steps.map((step) => (
              <li key={step.label}>
                <Link
                  href={`/dashboard/workflow?step=${step.step}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5 transition-all duration-200 ease-premium hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]"
                >
                  <span className="text-sm font-medium text-slate-900">{step.label}</span>
                  <StatusBadge status={step.done ? "completed" : "pending"} />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Workspace" className="animate-fade-in-up stagger-4">
          {query ? (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Active query:</span> {query}
              {query.length >= 80 ? "…" : ""}
            </p>
          ) : (
            <p className="text-sm text-slate-600">No active extraction query yet.</p>
          )}
          {mailbox?.configured ? (
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Mailbox:</span> {mailbox.user}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Mailbox not connected.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <LinkButton href="/dashboard/results" variant="secondary" size="sm">
              View results
            </LinkButton>
            <LinkButton href="/dashboard/developers" variant="secondary" size="sm">
              Integration guide
            </LinkButton>
          </div>
        </Panel>
      </div>
    </div>
  );
}
