"use client";

import { useEffect, useState } from "react";
import { getStoredApiKey, setStoredApiKey } from "@/lib/apiClient";
import { restClient } from "@/lib/restClient";
import { emailQuotaLabel, formatQuotaUsage } from "@/lib/formatUsage";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

type UsagePayload = {
  planName: string;
  emailsUsed: number;
  emailsLimit: number | null;
  emailQuotaPeriod: "day" | "week";
  extractionsToday: number;
  extractionsLimitDay: number | null;
  unlimitedQuota?: boolean;
  llmTokens30d?: number;
  llmEstCost30dUsd?: number;
  llmByModel?: Array<{ model: string; calls: number; totalTokens: number; estCostUsd: number }>;
};

type Integrations = {
  webhookUrl: string | null;
  slackWebhookUrl: string | null;
  notifyOnExtractionCompleted: boolean;
  notifyOnFailure: boolean;
};

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [usage, setUsage] = useState<UsagePayload | null>(null);
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [integrationMsg, setIntegrationMsg] = useState<string | null>(null);
  const [audit, setAudit] = useState<Array<{ action: string; createdAt: string }>>([]);
  const [billingPortalLoading, setBillingPortalLoading] = useState(false);

  useEffect(() => {
    setApiKey(getStoredApiKey());
    void Promise.all([
      restClient.usage.get(),
      restClient.integrations.get(),
      restClient.auditLog.list(15),
    ]).then(([usageRes, intRes, auditRes]) => {
      if (usageRes.success) setUsage(usageRes.data as UsagePayload);
      if (intRes.success) setIntegrations(intRes.data);
      if (auditRes.success) setAudit(auditRes.data.items);
    });
  }, []);

  function saveKey() {
    setStoredApiKey(apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function openBillingPortal() {
    setBillingPortalLoading(true);
    const res = await restClient.billing.portal();
    setBillingPortalLoading(false);
    if (res.success && res.data.url) window.location.href = res.data.url;
    else if (!res.success) setIntegrationMsg(res.message);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="section-label">Workspace</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Settings</h1>
      </div>

      {usage ? (
        <>
          <Panel title={`Plan: ${usage.planName}`}>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-muted">{emailQuotaLabel(usage.emailQuotaPeriod)}</dt>
                <dd className="font-semibold text-ink">
                  {formatQuotaUsage(usage.emailsUsed, usage.emailsLimit, usage.unlimitedQuota)}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Extractions today</dt>
                <dd className="font-semibold text-ink">
                  {formatQuotaUsage(usage.extractionsToday, usage.extractionsLimitDay, usage.unlimitedQuota)}
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel title="LLM usage (30 days)" description="Estimated from OpenRouter token reports — not an invoice.">
            <p className="text-sm text-ink">
              <span className="font-semibold">{usage.llmTokens30d?.toLocaleString() ?? "0"}</span> tokens · est.{" "}
              <span className="font-semibold">${(usage.llmEstCost30dUsd ?? 0).toFixed(4)}</span> USD
            </p>
            {usage.llmByModel && usage.llmByModel.length > 0 ? (
              <table className="mt-4 w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-ink/10 text-ink-muted">
                    <th className="py-2">Model</th>
                    <th className="py-2">Calls</th>
                    <th className="py-2">Tokens</th>
                    <th className="py-2">Est. $</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.llmByModel.map((row) => (
                    <tr key={row.model} className="border-b border-ink/5">
                      <td className="py-2 font-mono">{row.model.split("/").pop()}</td>
                      <td className="py-2">{row.calls}</td>
                      <td className="py-2">{row.totalTokens.toLocaleString()}</td>
                      <td className="py-2">${row.estCostUsd.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">No LLM calls recorded yet — extract or enhance a prompt.</p>
            )}
          </Panel>
        </>
      ) : null}

      <Panel
        title="Developer API key"
        description="Optional — for REST calls from your own backend scripts. Your Google session covers the dashboard."
      >
        <input
          className="input-field font-mono"
          type="password"
          placeholder="Paste API key from your deployment"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          autoComplete="off"
        />
        <Button variant="accent" className="mt-4" onClick={saveKey}>
          Save key
        </Button>
        {saved ? <p className="mt-2 text-sm text-moss">Saved — applied to REST API requests.</p> : null}
      </Panel>

      <Panel
        title="Webhooks & notifications"
        description="Manage Slack + CRM delivery on the Integrations page — same settings, clearer tooling map for brokerages."
      >
        <a href="/dashboard/integrations" className="inline-flex text-sm font-semibold text-accent hover:underline">
          Open Connect your tools →
        </a>
        {integrations ? (
          <p className="mt-3 text-xs text-ink-muted">
            Webhook {integrations.webhookUrl ? "connected" : "not set"} · Slack{" "}
            {integrations.slackWebhookUrl ? "connected" : "not set"}
          </p>
        ) : null}
        {integrationMsg ? <p className="mt-2 text-sm text-moss">{integrationMsg}</p> : null}
      </Panel>

      <Panel title="Audit log (recent)">
        {audit.length === 0 ? (
          <p className="text-sm text-ink-muted">No audit events yet.</p>
        ) : (
          <ul className="space-y-2 text-xs font-mono text-ink-muted">
            {audit.map((row) => (
              <li key={`${row.createdAt}-${row.action}`}>
                {new Date(row.createdAt).toLocaleString()} · {row.action}
              </li>
            ))}
          </ul>
        )}
        <a href="/dashboard/team" className="mt-3 inline-block text-xs font-semibold text-rust hover:underline">
          Team & seats →
        </a>
      </Panel>

      <Panel title="Billing">
        <p className="text-sm text-ink-muted">
          Manage plans on{" "}
          <a href="/dashboard/pricing" className="font-semibold text-rust hover:underline">
            Plans
          </a>
          . Higher tiers unlock more models in Prompt studio.
        </p>
        <Button variant="secondary" size="sm" className="mt-3" disabled={billingPortalLoading} onClick={() => void openBillingPortal()}>
          {billingPortalLoading ? "Opening…" : "Stripe customer portal"}
        </Button>
      </Panel>
    </div>
  );
}
