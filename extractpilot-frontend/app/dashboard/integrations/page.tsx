"use client";

import { useEffect, useState } from "react";
import { restClient } from "@/lib/restClient";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";

type Integrations = {
  webhookUrl: string | null;
  slackWebhookUrl: string | null;
  notifyOnExtractionCompleted: boolean;
  notifyOnFailure: boolean;
};

const TOOLS = [
  {
    id: "gmail",
    name: "Gmail / Outlook",
    status: "live" as const,
    blurb: "Connect multiple agent and office inboxes inside Mailboxes.",
    href: "/dashboard/mailboxes",
    cta: "Connect mailboxes",
  },
  {
    id: "slack",
    name: "Slack",
    status: "live" as const,
    blurb: "Get extraction completed / failed alerts in a channel via incoming webhook.",
    href: "#slack",
    cta: "Configure below",
  },
  {
    id: "webhook",
    name: "Custom webhook / CRM",
    status: "live" as const,
    blurb: "POST structured JSON to Follow Up Boss, HubSpot, Salesforce, or your own API.",
    href: "#webhook",
    cta: "Configure below",
  },
  {
    id: "zapier",
    name: "Zapier / Make",
    status: "guide" as const,
    blurb: "Create a Catch Hook, paste it as your customer webhook, map fields into your CRM.",
    href: "/docs",
    cta: "See Docs",
  },
  {
    id: "fub",
    name: "Follow Up Boss",
    status: "guide" as const,
    blurb: "Send buyer-lead fields from ExtractPilot → Zapier → Follow Up Boss people / deals.",
    href: "/docs",
    cta: "Integration guide",
  },
  {
    id: "hubspot",
    name: "HubSpot / Salesforce",
    status: "guide" as const,
    blurb: "Use the customer webhook to create contacts, deals, or tasks from extracted email.",
    href: "/docs",
    cta: "Integration guide",
  },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void restClient.integrations.get().then((res) => {
      if (res.success) setIntegrations(res.data);
    });
  }, []);

  async function save() {
    if (!integrations) return;
    setSaving(true);
    setMsg(null);
    const res = await restClient.integrations.patch(integrations);
    setSaving(false);
    setMsg(res.message ?? (res.success ? "Saved." : "Could not save."));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="section-label">Workspace</p>
        <h1 className="page-title !mt-2">Connect your tools</h1>
        <p className="page-lede">
          Wire ExtractPilot into the stack your brokerage already runs — mailboxes first, then Slack alerts and CRM
          webhooks so structured leads never die in the inbox.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <article key={tool.id} className="saas-card flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-night">{tool.name}</h2>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  tool.status === "live" ? "bg-moss/15 text-moss" : "bg-ink/5 text-ink-muted"
                }`}
              >
                {tool.status === "live" ? "Live" : "Via webhook"}
              </span>
            </div>
            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-ink-muted">{tool.blurb}</p>
            <LinkButton href={tool.href} variant="secondary" size="sm" className="mt-4 w-fit">
              {tool.cta}
            </LinkButton>
          </article>
        ))}
      </div>

      <Panel
        title="Delivery endpoints"
        description="We POST JSON on extraction.completed and extraction.failed. Use these URLs to land data in Slack or any CRM listener."
      >
        {integrations ? (
          <div className="space-y-4 text-sm">
            <label id="webhook" className="block scroll-mt-28">
              <span className="font-medium text-night">Customer webhook URL</span>
              <p className="mt-1 text-[13px] text-ink-muted">
                Paste a Zapier Catch Hook, Make webhook, Follow Up Boss listener, or your own HTTPS endpoint.
              </p>
              <input
                className="input-field mt-2 font-mono text-xs"
                value={integrations.webhookUrl ?? ""}
                onChange={(e) => setIntegrations({ ...integrations, webhookUrl: e.target.value || null })}
                placeholder="https://hooks.zapier.com/hooks/catch/…"
              />
            </label>
            <label id="slack" className="block scroll-mt-28">
              <span className="font-medium text-night">Slack incoming webhook</span>
              <p className="mt-1 text-[13px] text-ink-muted">Channel alerts when extractions finish or fail.</p>
              <input
                className="input-field mt-2 font-mono text-xs"
                value={integrations.slackWebhookUrl ?? ""}
                onChange={(e) => setIntegrations({ ...integrations, slackWebhookUrl: e.target.value || null })}
                placeholder="https://hooks.slack.com/services/…"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={integrations.notifyOnExtractionCompleted}
                onChange={(e) =>
                  setIntegrations({ ...integrations, notifyOnExtractionCompleted: e.target.checked })
                }
              />
              Notify on completed / partial extraction
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={integrations.notifyOnFailure}
                onChange={(e) => setIntegrations({ ...integrations, notifyOnFailure: e.target.checked })}
              />
              Notify on failures
            </label>
            <div className="flex flex-wrap gap-3">
              <Button variant="accent" size="sm" disabled={saving} onClick={() => void save()}>
                {saving ? "Saving…" : "Save connections"}
              </Button>
              <LinkButton href="/docs" variant="ghost" size="sm">
                See Docs
              </LinkButton>
              <LinkButton href="/dashboard/developers" variant="ghost" size="sm">
                API reference
              </LinkButton>
            </div>
            {msg ? <p className="text-sm text-moss">{msg}</p> : null}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Loading…</p>
        )}
      </Panel>
    </div>
  );
}
