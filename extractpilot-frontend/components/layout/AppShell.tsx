"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { GuardedLink } from "@/components/ui/GuardedLink";
import { usePrefetchEmailListPage } from "@/hooks/useEmailQueries";
import { usePrefetchUserQueryResults } from "@/hooks/useUserQueryQueries";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/Button";

const nav = [
  { href: "/dashboard", label: "Overview", icon: "◆", prefetch: null as null | "results" | "emails" },
  { href: "/dashboard/workflow", label: "Pipeline", icon: "▶", prefetch: null },
  { href: "/dashboard/results", label: "Results", icon: "◎", prefetch: "results" as const },
  { href: "/dashboard/emails", label: "Emails", icon: "≡", prefetch: "emails" as const },
  { href: "/dashboard/developers", label: "Integration guide", icon: "⌘", prefetch: null },
  { href: "/dashboard/pricing", label: "Plans", icon: "◇", prefetch: null },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙", prefetch: null },
];
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const prefetchResults = usePrefetchUserQueryResults();
  const prefetchEmails = usePrefetchEmailListPage();

  function warmRoute(kind: "results" | "emails" | null) {
    if (kind === "results") prefetchResults();
    if (kind === "emails") prefetchEmails();
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col px-4 py-5">
          <GuardedLink
            href="/"
            className="group mb-6 flex items-center gap-2.5 transition-opacity duration-200 hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white shadow-premium transition-transform duration-200 group-hover:scale-105">
              EP
            </div>
            <div>
              <p className="font-display text-sm font-bold tracking-tight text-slate-950">
                ExtractPilot
              </p>
              <p className="text-[11px] text-slate-500">Email intelligence</p>
            </div>
          </GuardedLink>

          <nav className="space-y-0.5">
            {nav.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <GuardedLink
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${active ? "nav-link-active" : ""}`}
                  onMouseEnter={() => warmRoute(item.prefetch)}
                  onFocus={() => warmRoute(item.prefetch)}
                >
                  <span className="text-[10px] opacity-70">{item.icon}</span>
                  {item.label}
                </GuardedLink>
              );
            })}
          </nav>

          <div className="mt-auto rounded-xl border border-slate-200 bg-slate-50 p-3.5 animate-fade-in-up stagger-4">
            <p className="section-label">Closed beta</p>
            <p className="mt-1.5 text-sm font-medium text-slate-900">Invite-only access</p>
            <p className="mt-0.5 text-xs text-slate-500">Official launch coming soon</p>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 animate-fade-in-down border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
          <div className="flex items-center justify-between px-5 py-3 lg:px-8">
            <div>
              <p className="section-label">Business Console</p>
              <p className="font-display text-base font-semibold text-slate-950">
                Email Extraction Platform
              </p>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <div className="hidden items-center gap-2 text-right sm:flex">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{user.name ?? user.email}</p>
                    <p className="text-[11px] text-slate-500">{user.email}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={signOut}>
                    Sign out
                  </Button>
                </div>
              ) : null}
              <GuardedLink
                href="/dashboard/workflow?step=1"
                className="hidden rounded-lg bg-slate-950 px-3.5 py-1.5 text-xs font-semibold text-white transition-all duration-200 ease-premium hover:bg-slate-800 hover:shadow-sm active:scale-[0.98] sm:inline-flex"
              >
                Run pipeline
              </GuardedLink>
            </div>
          </div>
        </header>
        <main className="page-enter px-5 py-5 lg:px-8 lg:py-6">{children}</main>
      </div>
    </div>
  );
}
