"use client";

import { useState, useTransition } from "react";
import { sendDecisionAction } from "@/app/actions";

export function SendButton({ decisionId, label = "Send to PayPal" }: { decisionId: number; label?: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await sendDecisionAction(decisionId);
            if (!result.ok) setError(result.message);
          })
        }
        className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-white hover:bg-accent-ink disabled:opacity-60"
      >
        {pending ? "Sending to PayPal…" : label}
      </button>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
