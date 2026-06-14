"use client";

import { useEffect, useState } from "react";
import { getStoredApiKey, setStoredApiKey } from "@/lib/apiClient";
import { restClient } from "@/lib/restClient";
import { emailQuotaLabel, formatQuotaUsage } from "@/lib/formatUsage";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [usage, setUsage] = useState<{
    planName: string;
    emailsUsed: number;
    emailsLimit: number | null;
    emailQuotaPeriod: "day" | "week";
    extractionsToday: number;
    extractionsLimitDay: number | null;
    unlimitedQuota?: boolean;
  } | null>(null);

  useEffect(() => {
    setApiKey(getStoredApiKey());
    void restClient.usage.get().then((res) => {
      if (res.success) setUsage(res.data);
    });
  }, []);

  function saveKey() {
    setStoredApiKey(apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="section-label">Workspace</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-slate-950">Settings</h1>
      </div>

      {usage ? (
        <Panel title={`Plan: ${usage.planName}`}>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">{usage ? emailQuotaLabel(usage.emailQuotaPeriod) : "Email quota"}</dt>
              <dd className="font-semibold">
                {formatQuotaUsage(usage.emailsUsed, usage.emailsLimit, usage.unlimitedQuota)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Extractions today</dt>
              <dd className="font-semibold">
                {formatQuotaUsage(usage.extractionsToday, usage.extractionsLimitDay, usage.unlimitedQuota)}
              </dd>
            </div>
          </dl>
        </Panel>
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
        {saved ? <p className="mt-2 text-sm text-emerald-700">Saved — applied to REST API requests.</p> : null}
        <p className="mt-4 text-xs text-slate-500">
          Use this only for programmatic REST integration. The dashboard uses your Google sign-in session.
        </p>
      </Panel>

      <Panel title="Billing (closed beta)">
        <p className="text-sm text-slate-600">
          Paid upgrades are disabled during invite-only beta testing. Preview planned tiers on the{" "}
          <a href="/dashboard/pricing" className="font-semibold text-blue-700 hover:underline">
            Plans page
          </a>
          . Official launch with self-serve billing is coming soon.
        </p>
      </Panel>
    </div>
  );
}
