"use client";

import { useState, useTransition } from "react";
import { syncAction } from "@/app/actions";

export function SyncButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="flex items-center gap-3">
      {message && (
        <span role="status" className={`text-[13px] ${message.ok ? "text-muted" : "text-danger"}`}>
          {message.text}
        </span>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await syncAction();
            setMessage({ ok: result.ok, text: result.message });
          })
        }
        className="flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 font-semibold text-ink hover:bg-subtle disabled:opacity-60"
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
        {pending ? "Syncing…" : "Sync with PayPal"}
      </button>
    </div>
  );
}
