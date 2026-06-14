"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { ConfirmLeaveModal } from "@/components/ui/ConfirmLeaveModal";

type LeaveHandler = () => void;

type ExtractionRunContextValue = {
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
  guardNavigate: (href: string) => void;
  registerLeaveHandler: (handler: LeaveHandler) => () => void;
};

const ExtractionRunContext = createContext<ExtractionRunContextValue | null>(null);

export function ExtractionRunProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const leaveHandlersRef = useRef<Set<LeaveHandler>>(new Set());

  useEffect(() => {
    if (!isRunning) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isRunning]);

  const registerLeaveHandler = useCallback((handler: LeaveHandler) => {
    leaveHandlersRef.current.add(handler);
    return () => {
      leaveHandlersRef.current.delete(handler);
    };
  }, []);

  const confirmLeave = useCallback(() => {
    for (const handler of leaveHandlersRef.current) {
      handler();
    }
    leaveHandlersRef.current.clear();
    setIsRunning(false);
    const href = pendingHref;
    setPendingHref(null);
    if (href) router.push(href);
  }, [pendingHref, router]);

  const cancelLeave = useCallback(() => {
    setPendingHref(null);
  }, []);

  const guardNavigate = useCallback(
    (href: string) => {
      if (!isRunning) {
        router.push(href);
        return;
      }
      setPendingHref(href);
    },
    [isRunning, router],
  );

  return (
    <ExtractionRunContext.Provider
      value={{ isRunning, setIsRunning, guardNavigate, registerLeaveHandler }}
    >
      {children}
      <ConfirmLeaveModal
        open={pendingHref !== null}
        onStay={cancelLeave}
        onLeave={confirmLeave}
      />
    </ExtractionRunContext.Provider>
  );
}

export function useExtractionRun(): ExtractionRunContextValue {
  const ctx = useContext(ExtractionRunContext);
  if (!ctx) {
    throw new Error("useExtractionRun must be used within ExtractionRunProvider");
  }
  return ctx;
}
