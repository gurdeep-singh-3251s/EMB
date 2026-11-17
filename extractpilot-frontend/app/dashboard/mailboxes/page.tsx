"use client";

import { useCallback, useEffect, useState } from "react";
import { IMAP_PROVIDER_PRESETS, presetById, type ImapProviderPresetId } from "@repo/types/imapProviders";
import { restClient } from "@/lib/restClient";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

type Mailbox = {
  id: string;
  label: string;
  host: string;
  port: number;
  imapUser: string;
  isActive: boolean;
  provider: string;
};

export default function MailboxesPage() {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [presetId, setPresetId] = useState<ImapProviderPresetId>("gmail");
  const [label, setLabel] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [host, setHost] = useState("imap.gmail.com");
  const [port, setPort] = useState("993");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await restClient.mailboxes.list();
    if (res.success) setMailboxes(res.data.mailboxes as Mailbox[]);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function applyPreset(id: ImapProviderPresetId) {
    setPresetId(id);
    const p = presetById(id);
    if (p.host) setHost(p.host);
    setPort(String(p.port));
  }

  async function addMailbox() {
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await restClient.mailboxes.connect({
      user: user.trim(),
      password,
      host: host.trim(),
      port: Number(port),
      providerPreset: presetId,
      label: label.trim() || user.trim(),
      setActive: mailboxes.length === 0,
    });
    setLoading(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    setMessage("Mailbox saved.");
    setPassword("");
    await refresh();
  }

  async function setActive(id: string) {
    const res = await restClient.mailboxes.activate(id);
    if (res.success) await refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remove this mailbox?")) return;
    const res = await restClient.mailboxes.remove(id);
    if (res.success) await refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="section-label">Workspace</p>
        <h1 className="mt-1.5 font-display text-2xl font-semibold text-ink">Connect multiple mailboxes</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Add Gmail, Outlook, Zoho, or any IMAP inbox — finance, sales, founder, vendors. Extraction always runs on
          the <strong>active</strong> mailbox so you can automate every workflow from one place.
        </p>
      </div>

      <Panel title="Your mailboxes">
        {mailboxes.length === 0 ? (
          <p className="text-sm text-ink-muted">No mailboxes yet — add one below.</p>
        ) : (
          <ul className="space-y-2">
            {mailboxes.map((mb) => (
              <li
                key={mb.id}
                className={`rounded-lg border px-3 py-3 text-sm ${
                  mb.isActive ? "border-rust/40 bg-rust/5" : "border-ink/10"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">{mb.label}</p>
                    <p className="text-xs text-ink-muted">
                      {mb.imapUser} · {mb.host}:{mb.port}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!mb.isActive ? (
                      <Button variant="secondary" size="sm" onClick={() => void setActive(mb.id)}>
                        Set active
                      </Button>
                    ) : (
                      <span className="rounded-md bg-moss/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-moss">
                        Active
                      </span>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => void remove(mb.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Add mailbox">
        <div className="grid gap-3 sm:grid-cols-3">
          {IMAP_PROVIDER_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id as ImapProviderPresetId)}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${
                presetId === p.id ? "border-rust bg-rust/5" : "border-ink/10"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input className="input-field" placeholder="Label (e.g. AP inbox)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <input className="input-field" placeholder="Email / IMAP user" value={user} onChange={(e) => setUser(e.target.value)} />
          <input className="input-field" type="password" placeholder="App password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className="input-field" placeholder="Host" value={host} onChange={(e) => setHost(e.target.value)} />
          <input className="input-field" placeholder="Port" value={port} onChange={(e) => setPort(e.target.value)} />
        </div>
        <Button variant="accent" className="mt-4" disabled={loading} onClick={() => void addMailbox()}>
          {loading ? "Saving…" : "Save mailbox"}
        </Button>
        {message ? <p className="mt-2 text-sm text-moss">{message}</p> : null}
        {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
      </Panel>
    </div>
  );
}
