"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { BetaBanner } from "@/components/layout/BetaBanner";
import { ExtractionRunProvider } from "@/contexts/ExtractionRunContext";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <ExtractionRunProvider>
      <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
        <BetaBanner />
        <div className="flex min-h-0 flex-1 flex-col">
          <AppShell>{children}</AppShell>
        </div>
      </div>
    </ExtractionRunProvider>
  );
}
