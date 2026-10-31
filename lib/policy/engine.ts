import type { DeliveryStatus, Guardrails, Rule } from "./types";

/** Facts the engine decides on. Amount, reason and stage come from PayPal, not from the AI. */
export interface PolicyInput {
  reason: string;
  amount: number;
  currency: string;
  stage: string;
  recommendation: "fight" | "refund" | "needs_human";
  confidence: number;
  deliveryStatus: DeliveryStatus;
}

export interface PolicyCheck {
  label: string;
  passed: boolean;
  /** Short explanation shown when the check fails. */
  failReason: string;
}

export interface PolicyDecision {
  mode: "auto" | "approval";
  action: "fight" | "refund" | null;
  matchedRule: Pick<Rule, "id" | "text"> | null;
  checks: PolicyCheck[];
  reason: string;
}

function ruleMatches(rule: Rule, input: PolicyInput): boolean {
  const c = rule.conditions;
  if (c.reasons?.length && !c.reasons.includes(input.reason as never)) return false;
  if (c.maxAmount !== undefined && input.amount > c.maxAmount) return false;
  if (c.minAmount !== undefined && input.amount < c.minAmount) return false;
  if (c.deliveryStatus?.length && !c.deliveryStatus.includes(input.deliveryStatus)) return false;
  return true;
}

function stageName(stage: string) {
  return stage.charAt(0) + stage.slice(1).toLowerCase().replaceAll("_", " ");
}

function fmt(amount: number, currency: string) {
  return `${amount.toFixed(2)} ${currency}`;
}

/**
 * Deterministic policy engine: decides whether the agent may act on its own.
 * The AI never makes this call — it only provides the recommendation and confidence.
 */
export function evaluatePolicy(input: PolicyInput, rules: Rule[], guardrails: Guardrails): PolicyDecision {
  const active = rules.filter((r) => r.enabled);
  const action = input.recommendation === "needs_human" ? null : input.recommendation;

  const checks: PolicyCheck[] = [
    {
      label: "Agent reached a clear recommendation",
      passed: action !== null,
      failReason: "the agent could not reach a clear recommendation",
    },
    {
      label: `Dispute stage: ${stageName(input.stage)} (automatic action only in ${guardrails.autoStages.map(stageName).join(", ")})`,
      passed: guardrails.autoStages.includes(input.stage),
      failReason: `disputes in the ${stageName(input.stage).toLowerCase()} stage always need you`,
    },
    {
      label: `Amount within auto-limit (${fmt(input.amount, input.currency)} ≤ ${fmt(guardrails.maxAutoAmount, input.currency)})`,
      passed: input.amount <= guardrails.maxAutoAmount,
      failReason: `${fmt(input.amount, input.currency)} is over your ${fmt(guardrails.maxAutoAmount, input.currency)} auto-limit`,
    },
    {
      label: `Confidence at least ${Math.round(guardrails.minConfidence * 100)}% (agent: ${Math.round(input.confidence * 100)}%)`,
      passed: input.confidence >= guardrails.minConfidence,
      failReason: `the agent is only ${Math.round(input.confidence * 100)}% confident (minimum ${Math.round(guardrails.minConfidence * 100)}%)`,
    },
  ];

  const askRule = active.find((r) => r.action === "ask" && ruleMatches(r, input));
  const wanted = action === "fight" ? "auto_fight" : action === "refund" ? "auto_refund" : null;
  const autoRule = wanted ? active.find((r) => r.action === wanted && ruleMatches(r, input)) : undefined;

  checks.push({
    label: "No rule requires your approval",
    passed: !askRule,
    failReason: askRule ? `your rule “${askRule.text}” asks to check with you` : "",
  });
  checks.push({
    label: autoRule ? `Allowed by your rule: “${autoRule.text}”` : "A rule allows this action automatically",
    passed: Boolean(autoRule),
    failReason: action ? `none of your rules allows ${action === "fight" ? "fighting" : "refunding"} this dispute automatically` : "",
  });

  const failed = checks.find((c) => !c.passed);
  const matched = askRule ?? autoRule ?? null;

  if (failed) {
    return {
      mode: "approval",
      action,
      matchedRule: matched ? { id: matched.id, text: matched.text } : null,
      checks,
      reason: `Needs your approval: ${failed.failReason}.`,
    };
  }

  return {
    mode: "auto",
    action,
    matchedRule: autoRule ? { id: autoRule.id, text: autoRule.text } : null,
    checks,
    reason: `Acting automatically: ${action} ${fmt(input.amount, input.currency)}.`,
  };
}
