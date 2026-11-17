"use client";

import { useLayoutEffect, useRef, useState } from "react";
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

type NavItem = {
  href: string;
  label: string;
  icon: Parameters<typeof DashboardNavIcon>[0]["name"];
  prefetch: null | "results" | "emails";
};

const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "overview", prefetch: null },
  { href: "/dashboard/workflow", label: "Get started", icon: "pipeline", prefetch: null },
  { href: "/dashboard/mailboxes", label: "Mailboxes", icon: "emails", prefetch: null },
  { href: "/dashboard/prompts", label: "Prompts", icon: "developers", prefetch: null },
  { href: "/dashboard/results", label: "Results", icon: "results", prefetch: "results" },
];

const secondaryNav: NavItem[] = [
  { href: "/dashboard/review", label: "Review queue", icon: "emails", prefetch: null },
  { href: "/dashboard/emails", label: "All emails", icon: "emails", prefetch: "emails" },
  { href: "/dashboard/ops", label: "Health", icon: "overview", prefetch: null },
  { href: "/dashboard/developers", label: "API", icon: "developers", prefetch: null },
  { href: "/dashboard/pricing", label: "Plans", icon: "plans", prefetch: null },
  { href: "/dashboard/settings", label: "Settings", icon: "settings", prefetch: null },
];

const allNav = [...primaryNav, ...secondaryNav];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const prefetchResults = usePrefetchUserQueryResults();
  const prefetchEmails = usePrefetchEmailListPage();
  const mainRef = useRef<HTMLElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    gsap.fromTo(main, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" });
  }, [pathname]);

  useLayoutEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;
    const links = aside.querySelectorAll<HTMLElement>(".nav-item");
    gsap.from(links, { opacity: 0, x: -10, duration: 0.4, stagger: 0.03, ease: "power2.out", delay: 0.05 });
  }, []);

  useLayoutEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function warmRoute(kind: "results" | "emails" | null) {
    if (kind === "results") prefetchResults();
    if (kind === "emails") prefetchEmails();
  }

  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  }

  function renderNav(items: NavItem[]) {
    return items.map((item) => {
      const active = isActive(item.href);
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
    });
  }

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[260px_1fr]">
      <aside
        ref={asideRef}
        className={`border-b border-ink/[0.06] bg-paper-elevated lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r ${
          mobileOpen ? "block" : "hidden lg:block"
        }`}
      >
        <div className="flex h-full flex-col px-4 py-6">
          <GuardedLink href="/" className="mb-7 flex items-center gap-3 transition-opacity hover:opacity-85">
            <LogoMark size="sm" />
            <Wordmark subtitle="Workspace" />
          </GuardedLink>

          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-faint">Main</p>
          <nav className="space-y-0.5">{renderNav(primaryNav)}</nav>

          <p className="mb-2 mt-6 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-faint">More</p>
          <nav className="space-y-0.5">{renderNav(secondaryNav)}</nav>

          <div className="mt-auto rounded-2xl border border-ink/[0.07] bg-paper p-4">
            <p className="text-[13px] font-semibold text-night">Need help?</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
              Start with <span className="font-medium text-night">Get started</span> — three steps and you&apos;re extracting.
            </p>
            <GuardedLink href="/dashboard/workflow?step=1" className="link-arrow mt-3 text-[13px]">
              Open setup <span aria-hidden>↗</span>
            </GuardedLink>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-ink/[0.06] bg-paper/90 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-10 lg:py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-ink/10 bg-paper-elevated text-night lg:hidden"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                onClick={() => setMobileOpen((v) => !v)}
              >
                <span className="text-lg leading-none">{mobileOpen ? "×" : "☰"}</span>
              </button>
              <HeaderTitle pathname={pathname} />
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {user ? (
                <div className="hidden items-center gap-3 text-right sm:flex">
                  <div>
                    <p className="text-[14px] font-semibold text-ink">{user.name ?? user.email}</p>
                    <p className="text-[12px] text-ink-muted">{user.email}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={signOut}>
                    Sign out
                  </Button>
                </div>
              ) : null}
              <GuardedLink href="/dashboard/workflow?step=1">
                <Button variant="accent" size="sm">
                  Extract now
                </Button>
              </GuardedLink>
            </div>
          </div>
        </header>
        <main ref={mainRef} className="px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <Stagger selector="[data-reveal]">{children}</Stagger>
        </main>
      </div>
    </div>
  );
}

function HeaderTitle({ pathname }: { pathname: string }) {
  const label =
    allNav.find((n) => pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href)))?.label ??
    "Home";
  return (
    <div>
      <p className="section-label">ExtractPilot</p>
      <p className="text-base font-bold tracking-tight text-night sm:text-lg">{label}</p>
    </div>
  );
}
