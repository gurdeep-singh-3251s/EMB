"use client";

import { useEffect, useState } from "react";
import { restClient } from "@/lib/restClient";
import { Panel } from "@/components/ui/Panel";

export default function TeamPage() {
  const [data, setData] = useState<{
    planId: string;
    seats: { used: number; limit: number; inviteComingSoon: boolean };
    members: Array<{ email: string | null; name: string | null; role: string }>;
  } | null>(null);

  useEffect(() => {
    void restClient.workspace.get().then((res) => {
      if (res.success) setData(res.data);
    });
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="section-label">Workspace</p>
        <h1 className="mt-1.5 font-display text-2xl font-semibold text-ink">Team</h1>
        <p className="mt-2 text-sm text-ink-muted">Solo workspaces today — multi-seat invites ship with org billing.</p>
      </div>

      {data ? (
        <>
          <Panel title="Seats">
            <p className="text-sm text-ink">
              <span className="font-semibold">{data.seats.used}</span> / {data.seats.limit} seats on plan{" "}
              <span className="font-mono">{data.planId}</span>
            </p>
            {data.seats.inviteComingSoon ? (
              <p className="mt-2 text-xs text-ink-muted">Invite teammates — coming soon. You are the workspace owner.</p>
            ) : null}
          </Panel>
          <Panel title="Members">
            <ul className="text-sm">
              {data.members.map((m) => (
                <li key={m.email ?? "owner"} className="rounded-lg border border-ink/10 px-3 py-2">
                  <p className="font-medium text-ink">{m.name ?? m.email ?? "Owner"}</p>
                  <p className="text-xs text-ink-muted">
                    {m.email} · {m.role}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
