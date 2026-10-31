"use client";

import { useEffect, useState, useTransition } from "react";
import { syncAction } from "@/app/actions";

/**
 * Fixed-size sync button. The result appears as a small toast in the corner,
 * so the header toolbar never changes width or wraps while syncing.
 */
export function SyncButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(id);
  }, [message]);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        aria-busy={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await syncAction();
            setMessage({ ok: result.ok, text: result.message });
          })
        }
        className="flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3.5 font-semibold text-ink hover:bg-subtle disabled:cursor-wait"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={pending ? "animate-spin" : undefined}
        >
          <path d="M21 12a9 9 0 1 1-2.6-6.4" />
          <path d="M21 4v5h-5" />
        </svg>
        Sync with PayPal
      </button>
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50">
        {message && (
          <div
            role="status"
            className={`rounded-lg px-4 py-2.5 text-[13px] font-medium shadow-lg ${
              message.ok ? "bg-ink text-white" : "bg-red-50 text-danger ring-1 ring-red-200"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </>
  );
}
