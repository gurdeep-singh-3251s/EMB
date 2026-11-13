import { Suspense } from "react";
import LoginPage from "./LoginPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-paper text-sm text-ink-muted">
          Loading…
        </div>
      }
    >
      <LoginPage />
    </Suspense>
  );
}
