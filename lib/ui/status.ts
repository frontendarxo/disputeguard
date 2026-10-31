export type Tone = "neutral" | "info" | "warn" | "ok" | "danger";

export interface DisputeStatus {
  label: string;
  tone: Tone;
}

interface InvestigationLike {
  status: "running" | "completed" | "failed";
}
interface DecisionLike {
  mode: "auto" | "approval";
  status: string;
}

/** One status for the UI, combining the latest investigation and decision. */
export function deriveStatus(
  investigation: InvestigationLike | null | undefined,
  decision: DecisionLike | null | undefined,
  paypalStatus?: string,
): DisputeStatus {
  if (paypalStatus === "RESOLVED") return { label: "Resolved", tone: "ok" };
  if (!investigation) return { label: "New", tone: "neutral" };
  if (investigation.status === "running") return { label: "Investigating", tone: "info" };
  if (investigation.status === "failed") return { label: "Failed", tone: "danger" };
  if (!decision) return { label: "Investigated", tone: "neutral" };
  switch (decision.status) {
    case "pending_approval":
      return { label: "Awaiting approval", tone: "warn" };
    case "approved":
      return { label: decision.mode === "auto" ? "Auto-approved" : "Approved", tone: "info" };
    case "rejected":
      return { label: "Rejected by you", tone: "neutral" };
    case "executing":
      return { label: "Sending…", tone: "info" };
    case "executed":
      return { label: "Done", tone: "ok" };
    case "failed":
      return { label: "Action failed", tone: "danger" };
    default:
      return { label: decision.status, tone: "neutral" };
  }
}

export const toneClasses: Record<Tone, string> = {
  neutral: "bg-line-soft text-body",
  info: "bg-accent-soft text-accent-ink",
  warn: "bg-warn-soft text-warn",
  ok: "bg-ok-soft text-ok",
  danger: "bg-red-50 text-danger",
};

export const recommendationLabel: Record<string, string> = {
  fight: "Fight",
  refund: "Refund",
  needs_human: "Needs you",
};
