"use client";

import { useEffect, useState } from "react";
import { restClient } from "@/lib/restClient";
import { Panel } from "@/components/ui/Panel";

type ActivityDetail = {
  summary?: string;
  method?: string;
  path?: string;
  status?: number;
  actorEmail?: string | null;
  actorName?: string | null;
  ip?: string;
  userAgent?: string | null;
};

type ActivityItem = {
  id: string;
  action: string;
  detail: ActivityDetail | null;
  createdAt: string;
};

function asDetail(value: unknown): ActivityDetail | null {
  if (!value || typeof value !== "object") return null;
  return value as ActivityDetail;
}

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void restClient.auditLog.list(200).then((res) => {
      if (res.success) {
        setItems(
          res.data.items.map((row) => ({
            id: row.id,
            action: row.action,
            detail: asDetail(row.detail),
            createdAt: row.createdAt,
          })),
        );
      }
      setLoaded(true);
    });
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="section-label">Workspace</p>
        <h1 className="mt-1.5 font-display text-2xl font-semibold text-ink">Activity</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Who used this workspace, what they did, and how the request was made. Passwords, tokens, and email
          bodies are never stored here.
        </p>
      </div>

      <Panel title="Recent operations" description="Newest first. Reads like opening a page are not logged.">
        {!loaded ? (
          <p className="text-sm text-ink-muted">Loading activity…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink-muted">No activity yet. Sign-ins and changes will show up here.</p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {items.map((row) => {
              const detail = row.detail;
              const title = detail?.summary || row.action;
              const who = detail?.actorName || detail?.actorEmail || "Workspace owner";
              return (
                <li key={row.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium text-night">{title}</p>
                    <time className="text-[12px] text-ink-muted" dateTime={row.createdAt}>
                      {new Date(row.createdAt).toLocaleString()}
                    </time>
                  </div>
                  <p className="mt-1 text-[13px] text-ink-muted">
                    {who}
                    {detail?.actorEmail && detail.actorName ? ` · ${detail.actorEmail}` : ""}
                    {detail?.ip ? ` · ${detail.ip}` : ""}
                  </p>
                  <p className="mt-1 font-mono text-[12px] text-ink-faint">
                    {row.action}
                    {detail?.method ? ` · ${detail.method}` : ""}
                    {detail?.path ? ` ${detail.path}` : ""}
                    {typeof detail?.status === "number" ? ` · ${detail.status}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
