"use client";

import { useRef } from "react";
import { DecisionButtons } from "./decision-buttons";

/** Editable draft + approve/reject. The edited text is what gets sent to PayPal. */
export function ResponsePanel({
  label,
  draft,
  decisionId,
  approveLabel,
}: {
  label: string;
  draft: string;
  decisionId: number;
  approveLabel: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <>
      <label htmlFor="draft" className="text-base font-semibold">
        {label}
      </label>
      <textarea
        ref={ref}
        id="draft"
        rows={6}
        defaultValue={draft}
        className="resize-y rounded-lg border border-gray-300 p-3 leading-normal text-ink"
      />
      <DecisionButtons decisionId={decisionId} approveLabel={approveLabel} getResponseText={() => ref.current?.value ?? draft} />
    </>
  );
}
