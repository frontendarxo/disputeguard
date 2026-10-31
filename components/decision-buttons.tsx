"use client";

import { useState, useTransition } from "react";
import { approveDecisionAction, rejectDecisionAction } from "@/app/actions";

export function DecisionButtons({
  decisionId,
  approveLabel = "Approve",
  compact = false,
  getResponseText,
}: {
  decisionId: number;
  approveLabel?: string;
  compact?: boolean;
  /** Returns the (possibly edited) text to send; defaults to the agent's draft. */
  getResponseText?: () => string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const size = compact ? "min-h-10 px-3.5" : "min-h-11 px-4 flex-grow";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await approveDecisionAction(decisionId, getResponseText?.());
              if (!result.ok) setError(result.message);
            })
          }
          className={`${size} rounded-lg bg-accent font-semibold text-white hover:bg-accent-ink disabled:opacity-60`}
        >
          {pending ? "Sending to PayPal…" : approveLabel}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => rejectDecisionAction(decisionId))}
          className={`${compact ? "min-h-10 px-3.5" : "min-h-11 px-4"} rounded-lg border border-gray-300 bg-white font-semibold text-ink hover:bg-subtle disabled:opacity-60`}
        >
          Reject
        </button>
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
