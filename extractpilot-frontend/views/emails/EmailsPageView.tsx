"use client";

import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Panel } from "@/components/ui/Panel";
import { useExtractionRun } from "@/contexts/ExtractionRunContext";
import { usePrefetchEmailDetail } from "@/hooks/useEmailQueries";
import type { EmailListItemView } from "@/presenterProvider/email/EmailPresenterProvider";

export function EmailsPageView({
  emails,
  stats,
  loading,
  error,
}: {
  emails: EmailListItemView[];
  stats: (Record<string, number> & { total?: number }) | null;
  loading: boolean;
  error: string | null;
}) {
  const { guardNavigate } = useExtractionRun();
  const prefetchEmail = usePrefetchEmailDetail();

  if (loading) {
    return <p className="text-center text-slate-500">Loading emails…</p>;
  }

  if (error) {
    return (
      <Panel title="Error loading emails">
        <p className="text-sm text-rose-600">{error}</p>
      </Panel>
    );
  }

  function openEmail(id: string) {
    guardNavigate(`/dashboard/emails/${id}`);
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Total", stats?.total ?? 0],
            ["Completed", stats?.completed ?? 0],
            ["Failed", stats?.failed ?? 0],
            ["Pending", stats?.pending ?? 0],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="glass-panel p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="metric-value mt-2">{value}</p>
          </div>
        ))}
      </div>

      <Panel title="All stored emails" description="Click any row to open the full email">
        {emails.length === 0 ? (
          <p className="text-sm text-slate-500">No emails ingested yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-3 pr-4 font-semibold">Subject</th>
                  <th className="py-3 pr-4 font-semibold">Sender</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Attachments</th>
                  <th className="py-3 pr-4 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email) => (
                  <tr
                    key={email.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => openEmail(email.id)}
                    onMouseEnter={() => prefetchEmail(email.id)}
                    onFocus={() => prefetchEmail(email.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openEmail(email.id);
                      }
                    }}
                    className="cursor-pointer border-b border-slate-100 transition hover:bg-blue-50/60 focus:bg-blue-50/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400/40"
                  >
                    <td className="py-4 pr-4 font-medium text-slate-950">
                      {email.subject ?? "(No subject)"}
                    </td>
                    <td className="py-4 pr-4 text-slate-600">{email.sender ?? "—"}</td>
                    <td className="py-4 pr-4">
                      <StatusBadge status={email.processingStatus} />
                    </td>
                    <td className="py-4 pr-4 text-slate-700">{email.attachmentCount}</td>
                    <td className="py-4 pr-4 text-slate-600">{formatDate(email.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
