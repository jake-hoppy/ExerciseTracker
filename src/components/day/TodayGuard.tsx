"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { staleDate, today } from "@/lib/dates";

// A page left open across midnight — a home-screen app resumed at 6am —
// would log to yesterday (rule R7). When the tab comes back, re-render if
// the calendar date has moved on. Refreshes once per client date so a
// clock disagreement with the server can't loop.
export function TodayGuard({ rendered }: { rendered: string }) {
  const router = useRouter();
  const refreshedFor = useRef<string | null>(null);

  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== "visible") return;
      const now = today();
      if (staleDate(rendered, now) && refreshedFor.current !== now) {
        refreshedFor.current = now;
        router.refresh();
      }
    };
    check();
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [rendered, router]);

  return null;
}
