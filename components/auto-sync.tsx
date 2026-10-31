"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { syncAction } from "@/app/actions";

/** Quietly pulls new disputes from PayPal every minute while the dashboard is open. */
export function AutoSync({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const result = await syncAction();
      // Refresh either way: webhooks and the agent may have changed statuses meanwhile.
      if (result.ok) router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, router]);
  return null;
}
