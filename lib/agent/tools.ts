import { tool } from "ai";
import { z } from "zod";
import { PayPalApiError } from "../paypal/client";
import { getDispute, listDisputes } from "../paypal/disputes";
import { getTrackingForTransaction } from "../paypal/tracking";
import { findTransaction } from "../paypal/transactions";
import { assessmentSchema } from "./schema";

const MAX_TOOL_OUTPUT = 6000;

/** Keeps tool results small enough for the model and turns API errors into data. */
async function safeCall<T>(fn: () => Promise<T>) {
  try {
    const result = await fn();
    const json = JSON.stringify(result ?? null);
    return json.length > MAX_TOOL_OUTPUT
      ? { truncated: true, data: json.slice(0, MAX_TOOL_OUTPUT) }
      : { data: result ?? null };
  } catch (err) {
    if (err instanceof PayPalApiError) {
      return { error: err.message, status: err.status };
    }
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export const investigationTools = {
  get_dispute: tool({
    description:
      "Get full details of a PayPal dispute: reason, status, stage, amount, deadlines, disputed transactions, items and messages.",
    inputSchema: z.object({ dispute_id: z.string().describe("The PayPal dispute ID, e.g. PP-R-ABC-123.") }),
    execute: async ({ dispute_id }) =>
      safeCall(async () => {
        const d = await getDispute(dispute_id);
        return {
          dispute_id: d.dispute_id,
          reason: d.reason,
          status: d.status,
          stage: d.dispute_life_cycle_stage,
          channel: d.dispute_channel,
          amount: d.dispute_amount,
          created: d.create_time,
          seller_response_due_date: d.seller_response_due_date,
          disputed_transactions: d.disputed_transactions?.map((t) => ({
            seller_transaction_id: t.seller_transaction_id,
            created: t.create_time,
            status: t.transaction_status,
            gross_amount: t.gross_amount,
            invoice_number: t.invoice_number,
            buyer: t.buyer?.name,
            items: t.items,
          })),
          messages: d.messages,
          // Reason-specific details from PayPal, e.g. billing_disputes_properties.duplicate_transaction.original_transaction.
          extensions: d.extensions,
        };
      }),
  }),

  get_transaction: tool({
    description:
      "Look up a seller transaction with PayPal Transaction Search to confirm the payment, payer and shipping address.",
    inputSchema: z.object({
      transaction_id: z.string().describe("The seller_transaction_id from the dispute."),
      around: z.string().optional().describe("ISO date near the transaction, e.g. the dispute creation time."),
    }),
    execute: async ({ transaction_id, around }) =>
      safeCall(async () => {
        const tx = await findTransaction(transaction_id, around);
        return tx ?? { note: "Transaction not found yet. In the sandbox, indexing can take a few hours." };
      }),
  }),

  get_shipment_tracking: tool({
    description: "Get shipment tracking (carrier, tracking number, status) attached to a PayPal transaction.",
    inputSchema: z.object({ transaction_id: z.string().describe("The seller_transaction_id from the dispute.") }),
    execute: async ({ transaction_id }) => safeCall(() => getTrackingForTransaction(transaction_id)),
  }),

  list_disputes: tool({
    description: "List recent disputes for this seller account (ID, reason, status, amount, dates).",
    inputSchema: z.object({}),
    execute: async () => safeCall(() => listDisputes(50)),
  }),

  submit_assessment: tool({
    description: "Submit your final, structured assessment of the dispute. Call this exactly once, at the end.",
    inputSchema: assessmentSchema,
    execute: async () => ({ received: true }),
  }),
};

export type InvestigationToolName = keyof typeof investigationTools;
