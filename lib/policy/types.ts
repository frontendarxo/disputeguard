import { z } from "zod";

export const disputeReasons = [
  "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
  "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED",
  "UNAUTHORISED",
  "CREDIT_NOT_PROCESSED",
  "DUPLICATE_TRANSACTION",
  "INCORRECT_AMOUNT",
  "PAYMENT_BY_OTHER_MEANS",
  "CANCELED_RECURRING_BILLING",
  "PROBLEM_WITH_REMITTANCE",
  "OTHER",
] as const;

export const deliveryStatuses = [
  "delivered",
  "in_transit",
  "shipped_no_tracking_updates",
  "not_found",
  "lost",
  "not_applicable",
] as const;

export const ruleActions = ["auto_fight", "auto_refund", "ask"] as const;

export const ruleConditionsSchema = z.object({
  reasons: z.array(z.enum(disputeReasons)).optional().describe("Dispute reasons this rule applies to. Omit for any reason."),
  maxAmount: z.number().positive().optional().describe("Applies only when the disputed amount is at most this value."),
  minAmount: z.number().nonnegative().optional().describe("Applies only when the disputed amount is at least this value."),
  deliveryStatus: z.array(z.enum(deliveryStatuses)).optional().describe("Delivery statuses this rule applies to."),
});

/** What a rule looks like after the AI translated the seller's words. */
export const parsedRuleSchema = z.object({
  conditions: ruleConditionsSchema,
  action: z.enum(ruleActions).describe("auto_fight / auto_refund = act without asking; ask = always ask the seller."),
  explanation: z.string().describe("One sentence restating the rule exactly as you understood it."),
  unsupported: z
    .string()
    .optional()
    .describe("If part of the seller's wording cannot be expressed with these conditions, explain what was left out."),
});

export const ruleSchema = parsedRuleSchema.extend({
  id: z.string(),
  text: z.string().describe("The seller's original wording."),
  enabled: z.boolean(),
});

export type RuleConditions = z.infer<typeof ruleConditionsSchema>;
export type ParsedRule = z.infer<typeof parsedRuleSchema>;
export type Rule = z.infer<typeof ruleSchema>;
export type DisputeReason = (typeof disputeReasons)[number];
export type DeliveryStatus = (typeof deliveryStatuses)[number];

/** Hard limits that apply no matter what the rules say. */
export interface Guardrails {
  maxAutoAmount: number;
  minConfidence: number;
  autoStages: string[];
}

export const DEFAULT_GUARDRAILS: Guardrails = {
  maxAutoAmount: 100,
  minConfidence: 0.8,
  autoStages: ["INQUIRY"],
};
