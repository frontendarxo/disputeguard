"use client";

import { useTransition } from "react";
import { approveDecisionAction, rejectDecisionAction } from "@/app/actions";

export function DecisionButtons({
  decisionId,
  approveLabel = "Approve",
  compact = false,
}: {
  decisionId: number;
  approveLabel?: string;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const size = compact ? "min-h-10 px-3.5" : "min-h-11 px-4 flex-grow";
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => approveDecisionAction(decisionId))}
        className={`${size} rounded-lg bg-accent font-semibold text-white hover:bg-accent-ink disabled:opacity-60`}
      >
        {pending ? "Saving…" : approveLabel}
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
  );
}
