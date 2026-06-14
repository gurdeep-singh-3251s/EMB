"use client";

import { useEffect, useState } from "react";
import { IMAP_PROVIDER_PRESETS, presetById, type ImapProviderPresetId } from "@repo/types/imapProviders";
import { restClient, type ImapProviderPreset } from "@/lib/restClient";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";

const PROVIDER_LABELS: Record<string, string> = {
  gmail: "Gmail",
  outlook: "Outlook",
  zoho: "Zoho",
  imap: "IMAP",
};

const EMPTY_CONFIG = {
  configured: false,
  provider: null as string | null,
  providerPreset: null as string | null,
  host: "imap.gmail.com",
  port: 993,
  user: null as string | null,
};

export function MailboxConnectStep({ onComplete }: { onComplete?: () => void }) {
  const [config, setConfig] = useState<typeof EMPTY_CONFIG | null>(null);
  const [presets, setPresets] = useState<ImapProviderPreset[]>(IMAP_PROVIDER_PRESETS);
  const [presetId, setPresetId] = useState<ImapProviderPresetId>("gmail");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [host, setHost] = useState("imap.gmail.com");
  const [port, setPort] = useState("993");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedPreset = presetById(presetId);

  function applyPreset(id: ImapProviderPresetId) {
    setPresetId(id);
    const preset = presetById(id);
    if (preset.host) setHost(preset.host);
    setPort(String(preset.port));
  }

  async function refresh() {
    setLoadError(null);
    const res = await restClient.mailbox.config();
    if (!res.success) {
      setLoadError(res.message);
      setConfig({ ...EMPTY_CONFIG, host, port: Number(port) || 993 });
      return;
    }
    setConfig(res.data);
    if (res.data.user) setUser(res.data.user);
    setHost(res.data.host);
    setPort(String(res.data.port));
    if (res.data.providerPreset) applyPreset(res.data.providerPreset as ImapProviderPresetId);
  }

  useEffect(() => {
    void refresh();
    void restClient.mailbox.providers().then((res) => {
      if (res.success && res.data.presets.length > 0) setPresets(res.data.presets);
    });
  }, []);

  async function connect() {
    const portNum = Number(port);
    if (!Number.isFinite(portNum) || portNum < 1) {
      setError("Invalid port number.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await restClient.mailbox.connect({
      user: user.trim(),
      password,
      host: host.trim(),
      port: portNum,
      provider: selectedPreset.provider,
      providerPreset: presetId,
    });
    setLoading(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    setMessage(`Connected to ${PROVIDER_LABELS[res.data.provider] ?? res.data.provider} as ${res.data.user}`);
    setPassword("");
    await refresh();
    onComplete?.();
  }

  async function disconnect() {
    setLoading(true);
    const res = await restClient.mailbox.disconnect();
    setLoading(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    setMessage("Disconnected.");
    await refresh();
  }

  return (
    <div className="space-y-4">
      <Panel
        title="Connection status"
        action={
          config ? <StatusBadge status={config.configured ? "completed" : "pending"} /> : null
        }
      >
        {loadError ? <p className="text-sm text-rose-600">{loadError}</p> : null}
        {config ? (
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Provider</dt>
              <dd className="font-medium capitalize">{config.provider ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Server</dt>
              <dd className="font-medium">
                {config.host}:{config.port}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Account</dt>
              <dd className="font-medium">{config.user ?? "Not configured"}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-slate-500">Loading…</p>
        )}
      </Panel>

      <Panel title="Choose provider">
        <div className="grid gap-3 sm:grid-cols-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id as ImapProviderPresetId)}
              className={`rounded-lg border px-3.5 py-2.5 text-left transition-all duration-200 ease-premium ${
                presetId === preset.id
                  ? "border-blue-600 bg-blue-50 ring-2 ring-blue-500/20 scale-[1.01]"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]"
              }`}
            >
              <p className="text-sm font-semibold">{preset.label}</p>
              <p className="mt-1 font-mono text-xs text-slate-500">{preset.host || "Custom"}</p>
            </button>
          ))}
        </div>
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{selectedPreset.help}</p>
      </Panel>

      <Panel title="Credentials">
        <div className="grid gap-4">
          <input className="input-field" placeholder="Email" value={user} onChange={(e) => setUser(e.target.value)} />
          <input
            className="input-field"
            type="password"
            placeholder="App password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="input-field" value={host} onChange={(e) => setHost(e.target.value)} />
            <input className="input-field" value={port} onChange={(e) => setPort(e.target.value)} />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="accent" onClick={connect} disabled={loading || !user || !password || !host}>
            {loading ? "Connecting…" : "Connect"}
          </Button>
          <Button variant="secondary" onClick={disconnect} disabled={loading}>
            Disconnect
          </Button>
        </div>
        {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      </Panel>
    </div>
  );
}
