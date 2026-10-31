"use client";

import { useState, useTransition } from "react";
import { approveDecisionAction, rejectDecisionAction } from "@/app/actions";

export function DecisionButtons({
  decisionId,
  action,
  compact = false,
  getResponseText,
}: {
  decisionId: number;
  /** The proposed action; null when the agent left the decision to the seller. */
  action: "fight" | "refund" | null;
  compact?: boolean;
  /** Returns the (possibly edited) text to send; defaults to the agent's draft. */
  getResponseText?: () => string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const size = compact ? "min-h-10 px-3.5" : "min-h-11 px-4 flex-grow";
  const primary = `${size} rounded-lg bg-accent font-semibold text-white hover:bg-accent-ink disabled:opacity-60`;
  const secondary = `${compact ? "min-h-10 px-3.5" : "min-h-11 px-4"} rounded-lg border border-gray-300 bg-white font-semibold text-ink hover:bg-subtle disabled:opacity-60`;

  const approve = (chosen?: "fight" | "refund") =>
    startTransition(async () => {
      setError(null);
      const result = await approveDecisionAction(decisionId, getResponseText?.(), chosen);
      if (!result.ok) setError(result.message);
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {action ? (
          <button type="button" disabled={pending} onClick={() => approve()} className={primary}>
            {pending ? "Sending to PayPal…" : action === "fight" ? (compact ? "Approve" : "Approve & send response") : compact ? "Approve" : "Approve refund"}
          </button>
        ) : (
          <>
            <button type="button" disabled={pending} onClick={() => approve("fight")} className={primary}>
              {pending ? "Sending…" : "Fight"}
            </button>
            <button type="button" disabled={pending} onClick={() => approve("refund")} className={secondary}>
              Refund
            </button>
          </>
        )}
        <button type="button" disabled={pending} onClick={() => startTransition(() => rejectDecisionAction(decisionId))} className={secondary}>
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
