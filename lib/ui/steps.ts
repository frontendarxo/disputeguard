import type { AgentStepEvent } from "../agent/investigate";

const TITLES: Record<string, string> = {
  get_dispute: "Read the dispute",
  get_transaction: "Looked up the payment",
  get_shipment_tracking: "Checked shipment tracking",
  list_disputes: "Checked dispute history",
  submit_assessment: "Submitted the assessment",
};

export interface TimelineItem {
  key: string;
  title: string;
  detail: string;
  tool: string;
  ok: boolean;
}

function summarize(tool: string, output: unknown): { detail: string; ok: boolean } {
  const o = (output ?? {}) as { data?: unknown; error?: string; truncated?: boolean };
  if (o.error) return { detail: `PayPal returned an error: ${o.error}`, ok: false };
  const data = o.data as Record<string, unknown> | unknown[] | null | undefined;

  switch (tool) {
    case "get_dispute": {
      const d = (data ?? {}) as { reason?: string; amount?: { value?: string; currency_code?: string }; stage?: string };
      return {
        detail: [d.reason?.replaceAll("_", " ").toLowerCase(), d.amount && `${d.amount.value} ${d.amount.currency_code}`, d.stage && `${d.stage.toLowerCase()} stage`]
          .filter(Boolean)
          .join(" · "),
        ok: true,
      };
    }
    case "get_transaction": {
      const note = (data as { note?: string } | null)?.note;
      return { detail: note ?? "Payment found and matched to the dispute.", ok: !note };
    }
    case "get_shipment_tracking": {
      const trackers = (data as { trackers?: unknown[] } | null)?.trackers;
      if (!trackers || trackers.length === 0) return { detail: "No tracking attached to this payment.", ok: false };
      return { detail: `${trackers.length} tracking record(s) found.`, ok: true };
    }
    case "list_disputes": {
      const n = Array.isArray(data) ? data.length : 0;
      return { detail: `${n} dispute(s) on this account.`, ok: true };
    }
    default:
      return { detail: "", ok: true };
  }
}

/** Turns raw agent steps into a readable timeline for the UI. */
export function toTimeline(steps: AgentStepEvent[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const step of steps) {
    step.toolCalls.forEach((call, i) => {
      if (call.tool === "submit_assessment") return;
      const result = step.toolResults.find((r) => r.tool === call.tool) ?? step.toolResults[i];
      const { detail, ok } = result ? summarize(call.tool, result.output) : { detail: "Working…", ok: true };
      items.push({ key: `${step.index}-${i}`, title: TITLES[call.tool] ?? call.tool, detail, tool: call.tool, ok });
    });
  }
  return items;
}
