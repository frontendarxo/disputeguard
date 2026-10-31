import type { ParsedRule } from "../policy/types";
import { reasonLabel } from "./format";

const DELIVERY: Record<string, string> = {
  delivered: "delivered",
  in_transit: "in transit",
  shipped_no_tracking_updates: "shipped, no updates",
  not_found: "no tracking",
  lost: "lost",
  not_applicable: "not applicable",
};

export const ACTION_LABELS: Record<ParsedRule["action"], string> = {
  auto_fight: "Fight automatically",
  auto_refund: "Refund automatically",
  ask: "Ask for approval",
};

export const ACTION_CLASSES: Record<ParsedRule["action"], string> = {
  auto_fight: "bg-accent-soft text-accent-ink",
  auto_refund: "bg-line-soft text-body",
  ask: "bg-warn-soft text-warn",
};

/** Human-readable condition chips for a rule. */
export function conditionChips(rule: Pick<ParsedRule, "conditions">): string[] {
  const c = rule.conditions;
  const chips: string[] = [];
  if (c.reasons?.length) chips.push(`reason: ${c.reasons.map(reasonLabel).join(" or ").toLowerCase()}`);
  if (c.deliveryStatus?.length) chips.push(`delivery: ${c.deliveryStatus.map((d) => DELIVERY[d] ?? d).join(" or ")}`);
  if (c.minAmount !== undefined) chips.push(`amount ≥ $${c.minAmount}`);
  if (c.maxAmount !== undefined) chips.push(`amount ≤ $${c.maxAmount}`);
  if (chips.length === 0) chips.push("any dispute");
  return chips;
}
