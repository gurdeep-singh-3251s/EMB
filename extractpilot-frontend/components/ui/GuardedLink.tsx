"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { useExtractionRun } from "@/contexts/ExtractionRunContext";

export function GuardedLink({
  href,
  onClick,
  children,
  ...props
}: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const { isRunning, guardNavigate } = useExtractionRun();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (!isRunning) return;

    const target = typeof href === "string" ? href : href.pathname ?? "";
    const currentPath =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : pathname;
    if (target === currentPath) return;

    event.preventDefault();
    guardNavigate(target);
  }

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
