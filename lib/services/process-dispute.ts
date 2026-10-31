import { and, count, eq, gte, inArray } from "drizzle-orm";
import { getDb, schema } from "../db";
import { investigateDispute, type AgentStepEvent } from "../agent/investigate";
import { verifyDeliveryStatus, type Tracker } from "../policy/delivery";
import { evaluatePolicy } from "../policy/engine";
import { getTrackingForTransaction } from "../paypal/tracking";
import { loadRules } from "../policy/rules-store";
import { DEFAULT_GUARDRAILS, type DeliveryStatus } from "../policy/types";

/** Tracker records straight from PayPal (empty when there are none or the lookup fails). */
async function trackersFor(transactionId: string | null): Promise<Tracker[]> {
  if (!transactionId) return [];
  try {
    const data = (await getTrackingForTransaction(transactionId)) as { trackers?: Tracker[] };
    return data.trackers ?? [];
  } catch {
    return [];
  }
}
import { logActivity } from "./activity";
import { executeDecision } from "./execute-decision";
import { syncDispute } from "./sync";

/**
 * The core pipeline: refresh the dispute from PayPal, let the agent investigate,
 * let the policy engine decide, and store everything (with live step updates).
 */
export async function processDispute(
  disputeId: string,
  options: { onStep?: (s: AgentStepEvent) => void; investigationId?: number } = {},
) {
  const db = getDb();
  const dispute = await syncDispute(disputeId);

  const investigation = options.investigationId
    ? { id: options.investigationId }
    : (
        await db
          .insert(schema.investigations)
          .values({ disputeId, status: "running" })
          .returning({ id: schema.investigations.id })
      )[0];

  await logActivity({ disputeId, actor: "agent", type: "investigation.started", message: "Started investigating" });

  const steps: AgentStepEvent[] = [];
  // Step writes run one after another, so a late write can't overwrite the final result.
  let stepWrites: Promise<unknown> = Promise.resolve();
  try {
    const result = await investigateDispute(disputeId, {
      onStep: (step) => {
        steps.push(step);
        options.onStep?.(step);
        // Saved in the background so the UI can show progress while the agent works.
        const snapshot = [...steps];
        stepWrites = stepWrites
          .then(() => db.update(schema.investigations).set({ steps: snapshot }).where(eq(schema.investigations.id, investigation.id)))
          .catch(() => undefined);
      },
    });

    await stepWrites;
    const a = result.assessment;

    // Code decides: delivery status is checked against PayPal's tracker records.
    const claimed = a.deliveryStatus as DeliveryStatus;
    const verified = verifyDeliveryStatus(claimed, await trackersFor(dispute.sellerTransactionId));
    if (verified !== claimed) {
      await logActivity({
        disputeId,
        actor: "system",
        type: "investigation.adjusted",
        message: `Tracking doesn't confirm “${claimed.replaceAll("_", " ")}”; using “${verified.replaceAll("_", " ")}” for your rules`,
      });
    }

    await db
      .update(schema.investigations)
      .set({ status: "completed", model: result.model, assessment: a, steps: result.steps, finishedAt: new Date() })
      .where(eq(schema.investigations.id, investigation.id));

    const rules = await loadRules();
    const decision = evaluatePolicy(
      {
        reason: dispute.reason,
        amount: Number(dispute.amount),
        currency: dispute.currency,
        stage: dispute.stage ?? "UNKNOWN",
        recommendation: a.recommendation,
        confidence: a.confidence,
        deliveryStatus: verified,
      },
      rules,
      DEFAULT_GUARDRAILS,
    );

    const [saved] = await db
      .insert(schema.decisions)
      .values({
        disputeId,
        investigationId: investigation.id,
        mode: decision.mode,
        action: decision.action,
        reason: decision.reason,
        checks: decision.checks,
        matchedRuleId: decision.matchedRule?.id ?? null,
        status: decision.mode === "auto" ? "approved" : "pending_approval",
      })
      .returning();

    await logActivity({
      disputeId,
      actor: "agent",
      type: decision.mode === "auto" ? "decision.auto" : "decision.approval_needed",
      message:
        decision.mode === "auto"
          ? `Will ${decision.action} automatically (${Math.round(a.confidence * 100)}% confident)`
          : `Recommends ${a.recommendation} — ${decision.reason}`,
      data: { decisionId: saved.id },
    });

    // Allowed by the rules → carry it out in PayPal right away.
    if (saved.mode === "auto") {
      await executeDecision(saved.id);
      const [updated] = await db.select().from(schema.decisions).where(eq(schema.decisions.id, saved.id));
      return { dispute, assessment: a, decision: updated, investigationId: investigation.id };
    }

    return { dispute, assessment: a, decision: saved, investigationId: investigation.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await stepWrites;
    await db
      .update(schema.investigations)
      .set({ status: "failed", error: message, steps, finishedAt: new Date() })
      .where(eq(schema.investigations.id, investigation.id));
    await logActivity({ disputeId, actor: "agent", type: "investigation.failed", message: `Investigation failed: ${message}` });
    throw err;
  }
}

/**
 * Starts an investigation in the background (for the UI) and returns its id right away.
 * Reuses an investigation that is already running for this dispute.
 */
export async function startInvestigation(disputeId: string): Promise<number> {
  const db = getDb();
  const [running] = await db
    .select({ id: schema.investigations.id })
    .from(schema.investigations)
    .where(and(eq(schema.investigations.disputeId, disputeId), eq(schema.investigations.status, "running")))
    .limit(1);
  if (running) return running.id;

  const [handled] = await db
    .select({ id: schema.decisions.id })
    .from(schema.decisions)
    .where(and(eq(schema.decisions.disputeId, disputeId), inArray(schema.decisions.status, ["executing", "executed"])))
    .limit(1);
  if (handled) throw new Error("This dispute was already handled in PayPal.");

  // Protects the public demo from runaway AI costs.
  const limit = Number(process.env.MAX_INVESTIGATIONS_PER_HOUR ?? 30);
  const [{ value: recent }] = await db
    .select({ value: count() })
    .from(schema.investigations)
    .where(gte(schema.investigations.startedAt, new Date(Date.now() - 3_600_000)));
  if (recent >= limit) {
    throw new Error(`Investigation limit reached (${limit} per hour). Please try again later.`);
  }

  await syncDispute(disputeId);
  const [created] = await db
    .insert(schema.investigations)
    .values({ disputeId, status: "running" })
    .returning({ id: schema.investigations.id });

  void processDispute(disputeId, { investigationId: created.id }).catch((err) => {
    console.error(`[investigation ${created.id}]`, err);
  });
  return created.id;
}
