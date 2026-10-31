import { z } from "zod";

export const evidenceTypes = [
  "proof_of_delivery",
  "proof_of_shipment",
  "transaction_record",
  "invoice",
  "customer_communication",
  "other",
] as const;

/** The structured result the agent must submit at the end of an investigation. */
export const assessmentSchema = z.object({
  recommendation: z
    .enum(["fight", "refund", "needs_human"])
    .describe(
      "fight = contest the claim with evidence; refund = accept the claim; needs_human = facts are unclear or conflicting.",
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("How confident you are in the recommendation, from 0 to 1."),
  summary: z
    .string()
    .describe("2–4 sentences in plain language for the seller: what happened and why you recommend this."),
  keyFacts: z
    .array(
      z.object({
        fact: z.string().describe("A single verified fact."),
        source: z.string().describe("Which tool or data the fact came from, e.g. get_dispute."),
      }),
    )
    .describe("Only facts you actually saw in tool results. Never invent data."),
  evidence: z
    .array(
      z.object({
        type: z.enum(evidenceTypes),
        description: z.string(),
        available: z.boolean().describe("true only if the evidence exists in the data you retrieved."),
      }),
    )
    .describe("Evidence that supports the recommendation, including evidence that is missing."),
  draftResponse: z
    .string()
    .describe(
      "If fighting: a concise, factual response to PayPal on the seller's behalf. If refunding: a short, polite note to the buyer.",
    ),
  risks: z.array(z.string()).describe("Anything that could make this recommendation wrong."),
});

export type Assessment = z.infer<typeof assessmentSchema>;
