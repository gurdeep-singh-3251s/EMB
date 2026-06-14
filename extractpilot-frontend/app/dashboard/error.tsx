"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="section-label">Something went wrong</p>
      <h1 className="mt-3 font-display text-2xl font-bold text-slate-950">Dashboard error</h1>
      <p className="mt-3 text-sm text-slate-600">{error.message || "An unexpected error occurred."}</p>
      <Button variant="accent" className="mt-8" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
