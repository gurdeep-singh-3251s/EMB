"use client";

import { useEmailListPage } from "@/hooks/useEmailQueries";
import { EmailsPageView } from "@/views/emails/EmailsPageView";

export default function EmailsPage() {
  const { data, error, isLoading, isFetching } = useEmailListPage();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">Archive</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-slate-950">All emails</h1>
        </div>
        {isFetching && !isLoading ? (
          <p className="text-xs text-slate-400">Refreshing…</p>
        ) : null}
      </div>
      <EmailsPageView
        emails={data?.emails ?? []}
        stats={data?.stats ?? null}
        loading={isLoading && !data}
        error={error?.message ?? null}
      />
    </div>
  );
}
