"use client";

import { useTransition } from "react";
import { deleteRuleAction } from "@/app/actions";

export function RuleDelete({ ruleId, text }: { ruleId: string; text: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Delete rule: ${text}`}
      onClick={() => startTransition(() => deleteRuleAction(ruleId))}
      className="flex size-11 items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-danger disabled:opacity-50"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
      </svg>
    </button>
  );
}
