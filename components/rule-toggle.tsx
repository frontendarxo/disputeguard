"use client";

import { useOptimistic, useTransition } from "react";
import { toggleRuleAction } from "@/app/actions";

export function RuleToggle({ ruleId, enabled }: { ruleId: string; enabled: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(enabled);
  const [, startTransition] = useTransition();
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 font-medium text-body">
      <input
        type="checkbox"
        checked={optimistic}
        onChange={(e) => {
          const next = e.target.checked;
          startTransition(async () => {
            setOptimistic(next);
            await toggleRuleAction(ruleId, next);
          });
        }}
        className="size-[18px] accent-accent"
      />
      Enabled
    </label>
  );
}
