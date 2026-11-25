"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Refreshes the page every `seconds` while `active` (e.g. while a run is queued or running). */
export function AutoRefresh({ active, seconds = 3 }: { active: boolean; seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(timer);
  }, [active, seconds, router]);
  return null;
}
