"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import gsap from "gsap";
import { GuardedLink } from "@/components/ui/GuardedLink";
import { usePrefetchEmailListPage } from "@/hooks/useEmailQueries";
import { usePrefetchUserQueryResults } from "@/hooks/useUserQueryQueries";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { LogoMark, Wordmark } from "@/components/brand/LogoMark";
import { DashboardNavIcon } from "@/components/ui/DashboardNavIcon";
import { Stagger } from "@/components/motion/Stagger";

const nav: { href: string; label: string; icon: Parameters<typeof DashboardNavIcon>[0]["name"]; prefetch: null | "results" | "emails" }[] = [
  { href: "/dashboard", label: "Overview", icon: "overview", prefetch: null },
  { href: "/dashboard/prompts", label: "Prompt studio", icon: "developers", prefetch: null },
  { href: "/dashboard/mailboxes", label: "Mailboxes", icon: "emails", prefetch: null },
  { href: "/dashboard/workflow", label: "Pipeline", icon: "pipeline", prefetch: null },
  { href: "/dashboard/results", label: "Results", icon: "results", prefetch: "results" },
  { href: "/dashboard/review", label: "Review", icon: "emails", prefetch: null },
  { href: "/dashboard/emails", label: "Emails", icon: "emails", prefetch: "emails" },
  { href: "/dashboard/developers", label: "API guide", icon: "developers", prefetch: null },
  { href: "/dashboard/pricing", label: "Plans", icon: "plans", prefetch: null },
  { href: "/dashboard/ops", label: "Health", icon: "overview", prefetch: null },
  { href: "/dashboard/settings", label: "Settings", icon: "settings", prefetch: null },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const prefetchResults = usePrefetchUserQueryResults();
  const prefetchEmails = usePrefetchEmailListPage();
  const mainRef = useRef<HTMLElement>(null);
  const asideRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    gsap.fromTo(main, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" });
  }, [pathname]);

  useLayoutEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;
    const links = aside.querySelectorAll<HTMLElement>(".nav-item");
    gsap.from(links, { opacity: 0, x: -12, duration: 0.45, stagger: 0.04, ease: "power2.out", delay: 0.1 });
  }, []);

  function warmRoute(kind: "results" | "emails" | null) {
    if (kind === "results") prefetchResults();
    if (kind === "emails") prefetchEmails();
  }

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[272px_1fr]">
      <aside
        ref={asideRef}
        className="border-b border-ink/[0.06] bg-paper-elevated lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r"
      >
        <div className="flex h-full flex-col px-4 py-6">
          <GuardedLink href="/" className="mb-8 flex items-center gap-3 transition-opacity hover:opacity-85">
            <LogoMark size="sm" />
            <Wordmark subtitle="Workspace" />
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
                  className={`nav-item nav-link ${active ? "nav-link-active" : ""}`}
                  onMouseEnter={() => warmRoute(item.prefetch)}
                  onFocus={() => warmRoute(item.prefetch)}
                >
                  <DashboardNavIcon name={item.icon} />
                  {item.label}
                </GuardedLink>
              );
            })}
          </nav>

          <div className="mt-auto rounded-3xl border border-accent/20 bg-accent-soft/60 p-4">
            <p className="section-label-accent">Tip</p>
            <p className="mt-2 text-[15px] font-semibold text-night">Run pipeline daily</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
              Short lookback windows keep extraction costs predictable.
            </p>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-ink/[0.06] bg-paper/90 backdrop-blur-xl">
          <div className="flex items-center justify-between px-6 py-4 lg:px-10">
            <HeaderTitle pathname={pathname} />
            <div className="flex items-center gap-3">
              {user ? (
                <div className="hidden items-center gap-3 text-right sm:flex">
                  <div>
                    <p className="text-[15px] font-semibold text-ink">{user.name ?? user.email}</p>
                    <p className="text-[13px] text-ink-muted">{user.email}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={signOut}>
                    Sign out
                  </Button>
                </div>
              ) : null}
              <GuardedLink href="/dashboard/workflow?step=1">
                <Button variant="accent" size="sm">
                  Run pipeline
                </Button>
              </GuardedLink>
            </div>
          </div>
        </header>
        <main ref={mainRef} className="px-6 py-8 lg:px-10 lg:py-10">
          <Stagger selector="[data-reveal]">{children}</Stagger>
        </main>
      </div>
    </div>
  );
}

function HeaderTitle({ pathname }: { pathname: string }) {
  const label =
    nav.find((n) => pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href)))?.label ??
    "Overview";
  return (
    <div>
      <p className="section-label">Console</p>
      <p className="text-lg font-bold tracking-tight text-night">{label}</p>
    </div>
  );
}
