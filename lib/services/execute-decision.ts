import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import { describeError } from "../errors";
import { PayPalApiError } from "../paypal/client";
import { acceptClaim, provideEvidence, sendMessage, type TrackingInfo } from "../paypal/dispute-actions";
import { getTrackingForTransaction } from "../paypal/tracking";
import { logActivity } from "./activity";
import { syncDispute } from "./sync";

type Execution = NonNullable<(typeof schema.decisions.$inferSelect)["execution"]>;

/** Reads tracking numbers straight from PayPal (never from the AI's text). */
async function trackingFor(transactionId: string | null): Promise<TrackingInfo[]> {
  if (!transactionId) return [];
  try {
    const data = (await getTrackingForTransaction(transactionId)) as {
      trackers?: Array<{ tracking_number?: string; carrier?: string; carrier_name_other?: string }>;
    };
    return (data.trackers ?? [])
      .filter((t) => t.tracking_number)
      .map((t) => ({ tracking_number: t.tracking_number!, carrier_name: t.carrier ?? t.carrier_name_other ?? "OTHER" }));
  } catch {
    return [];
  }
}

/**
 * Carries out an approved decision in PayPal (sandbox):
 *  - refund → accept the claim
 *  - fight  → provide evidence (tracking when available); if PayPal does not accept
 *             evidence at this stage, send the response as a message instead.
 */
export async function executeDecision(decisionId: number, responseText?: string) {
  const db = getDb();
  const [decision] = await db.select().from(schema.decisions).where(eq(schema.decisions.id, decisionId)).limit(1);
  if (!decision) throw new Error("Decision not found.");
  if (decision.status !== "approved") throw new Error(`Decision is ${decision.status}, not approved.`);
  if (!decision.action) throw new Error("This decision has no action to carry out.");

  const [investigation] = await db
    .select()
    .from(schema.investigations)
    .where(eq(schema.investigations.id, decision.investigationId))
    .limit(1);
  const [dispute] = await db.select().from(schema.disputes).where(eq(schema.disputes.id, decision.disputeId)).limit(1);
  const text = (responseText ?? investigation?.assessment?.draftResponse ?? "").trim();
  if (!text) throw new Error("There is no response text to send.");

  await db.update(schema.decisions).set({ status: "executing", responseText: text }).where(eq(schema.decisions.id, decisionId));

  let execution: Execution;
  try {
    if (decision.action === "refund") {
      const paypal = await acceptClaim(decision.disputeId, text);
      execution = { method: "accept_claim", ok: true, detail: "Claim accepted — PayPal refunds the buyer.", paypal, at: new Date().toISOString() };
    } else {
      const tracking = await trackingFor(dispute?.sellerTransactionId ?? null);
      try {
        const paypal = await provideEvidence(decision.disputeId, text, tracking);
        execution = {
          method: "provide_evidence",
          ok: true,
          detail: tracking.length ? `Evidence sent with tracking ${tracking.map((t) => t.tracking_number).join(", ")}.` : "Written response sent as evidence.",
          paypal,
          at: new Date().toISOString(),
        };
      } catch (err) {
        if (!(err instanceof PayPalApiError) || err.status >= 500) throw err;
        // Evidence not accepted at this stage (e.g. inquiry) — reply to the buyer instead.
        const paypal = await sendMessage(decision.disputeId, text);
        execution = {
          method: "send_message",
          ok: true,
          detail: "PayPal isn't requesting evidence yet, so the response was sent to the buyer as a message.",
          paypal: { evidenceError: err.message, message: paypal },
          at: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    execution = { method: decision.action === "refund" ? "accept_claim" : "provide_evidence", ok: false, detail: describeError(err), at: new Date().toISOString() };
  }

  await db
    .update(schema.decisions)
    .set({ status: execution.ok ? "executed" : "failed", execution, executedAt: new Date() })
    .where(eq(schema.decisions.id, decisionId));

  await logActivity({
    disputeId: decision.disputeId,
    actor: "agent",
    type: execution.ok ? "action.executed" : "action.failed",
    message: execution.ok ? `Sent to PayPal: ${execution.detail}` : `PayPal action failed: ${execution.detail}`,
    data: { decisionId, method: execution.method },
  });

  // Pull the dispute's new state from PayPal.
  await syncDispute(decision.disputeId).catch(() => undefined);
  return execution;
}
