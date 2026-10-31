import { humanizeText } from "./format";
import type { Tone } from "./status";

export interface ActivityEntry {
  id: number;
  disputeId: string | null;
  actor: string;
  type: string;
  message: string;
  createdAt: Date;
}

export interface DisputeInfo {
  buyer: string;
  amount: string;
  currency: string;
  reason: string;
}

export interface ActivityGroup {
  key: string;
  disputeId: string | null;
  entries: ActivityEntry[]; // oldest → newest
  outcome: { label: string; tone: Tone };
  at: Date;
}

/** Visual tone for one activity entry. */
export function entryTone(type: string): Tone {
  if (type === "action.executed" || type === "decision.approved") return "ok";
  if (type.includes("approval_needed")) return "warn";
  if (type.includes("failed") || type.includes("blocked")) return "danger";
  if (type.startsWith("dispute.") || type.startsWith("rule.")) return "neutral";
  return "info";
}

/** Short, human message (no raw JSON or stack traces in the seller's UI). */
export function friendlyMessage(entry: Pick<ActivityEntry, "type" | "message">): string {
  if (entry.type === "investigation.failed") {
    if (/invalid_type|invalid format|Expected array/i.test(entry.message)) {
      return "Investigation failed: the agent's answer had an invalid format. Run it again.";
    }
    return truncate(entry.message.replace(/^Investigation failed:\s*/i, "Investigation failed: "), 140);
  }
  const text = humanizeText(entry.message)
    .replace(/ — Needs your approval: /, ". Needs you: ")
    .replace(/^PayPal action failed: The requested action could not be performed, semantically incorrect, or failed business validation\. \(HTTP 422\)$/, "PayPal didn't accept the action at this stage (HTTP 422).");
  return truncate(text, 160);
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function outcomeFor(latest: ActivityEntry): ActivityGroup["outcome"] {
  switch (latest.type) {
    case "action.executed":
      return { label: /refund/i.test(latest.message) ? "Refunded" : "Response sent", tone: "ok" };
    case "decision.auto":
      return { label: "Acting automatically", tone: "info" };
    case "decision.approval_needed":
      return { label: "Needs your approval", tone: "warn" };
    case "decision.approved":
      return { label: "Approved by you", tone: "ok" };
    case "decision.rejected":
      return { label: "Rejected by you", tone: "neutral" };
    case "investigation.started":
      return { label: "Investigating", tone: "info" };
    case "dispute.received":
      return { label: "Received", tone: "neutral" };
    default:
      if (latest.type === "action.failed" && /UNDER_REVIEW|under review|reviewing/i.test(latest.message)) {
        return { label: "PayPal reviewing", tone: "info" };
      }
      if (latest.type.includes("failed") || latest.type.includes("blocked")) return { label: "Failed", tone: "danger" };
      if (latest.type.startsWith("rule.")) return { label: "Rules updated", tone: "neutral" };
      return { label: "Updated", tone: "neutral" };
  }
}

/**
 * Groups the activity feed into one card per dispute (most recent first), so the
 * seller sees "what happened to each case" instead of four near-identical lines.
 */
export function groupActivity(entries: ActivityEntry[], limit = 6): ActivityGroup[] {
  const groups = new Map<string, ActivityEntry[]>();
  for (const e of entries) {
    const key = e.disputeId ?? `misc-${e.type.startsWith("rule.") ? "rules" : e.id}`;
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .map(([key, list]) => {
      // Oldest first; drop repeats of the same message (e.g. two identical failures in a row).
      const sorted = [...list]
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
        .filter((e, i, all) => i === 0 || e.message !== all[i - 1].message);
      const latest = sorted[sorted.length - 1];
      return { key, disputeId: latest.disputeId, entries: sorted, outcome: outcomeFor(latest), at: new Date(latest.createdAt) };
    })
    .sort((a, b) => +b.at - +a.at)
    .slice(0, limit);
}
