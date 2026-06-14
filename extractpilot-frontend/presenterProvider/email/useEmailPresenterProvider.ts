"use client";

import { useEffect, useMemo } from "react";
import { usePresenterSnapshot } from "../shared/usePresenterSnapshot";
import { createEmailPresenterProvider } from "./EmailPresenterProvider";

export function useEmailPresenterProvider() {
  const presenter = useMemo(() => createEmailPresenterProvider(), []);

  useEffect(() => {
    void presenter.init();
  }, [presenter]);

  const state = usePresenterSnapshot(presenter);
  return { presenter, state };
}
