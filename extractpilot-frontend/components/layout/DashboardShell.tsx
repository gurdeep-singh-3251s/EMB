"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { BetaBanner } from "@/components/layout/BetaBanner";
import { ExtractionRunProvider } from "@/contexts/ExtractionRunContext";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <ExtractionRunProvider>
      <BetaBanner />
      <AppShell>{children}</AppShell>
    </ExtractionRunProvider>
  );
}
