import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import { investigateDispute, type AgentStepEvent } from "../agent/investigate";
import { evaluatePolicy } from "../policy/engine";
import { loadRules } from "../policy/rules-store";
import { DEFAULT_GUARDRAILS, type DeliveryStatus } from "../policy/types";
import { logActivity } from "./activity";
import { syncDispute } from "./sync";

/**
 * The core pipeline: refresh the dispute from PayPal, let the agent investigate,
 * let the policy engine decide, and store everything (with live step updates).
 */
export async function processDispute(disputeId: string, options: { onStep?: (s: AgentStepEvent) => void } = {}) {
  const db = getDb();
  const dispute = await syncDispute(disputeId);

  const [investigation] = await db
    .insert(schema.investigations)
    .values({ disputeId, status: "running" })
    .returning({ id: schema.investigations.id });

  await logActivity({ disputeId, actor: "agent", type: "investigation.started", message: "Started investigating" });

  const steps: AgentStepEvent[] = [];
  try {
    const result = await investigateDispute(disputeId, {
      onStep: (step) => {
        steps.push(step);
        options.onStep?.(step);
        // Fire-and-forget so the UI can show progress while the agent works.
        void db.update(schema.investigations).set({ steps: [...steps] }).where(eq(schema.investigations.id, investigation.id));
      },
    });

    const a = result.assessment;
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
        deliveryStatus: a.deliveryStatus as DeliveryStatus,
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
        // Execution of approved actions against PayPal comes next (fight / refund).
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

    return { dispute, assessment: a, decision: saved, investigationId: investigation.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(schema.investigations)
      .set({ status: "failed", error: message, steps, finishedAt: new Date() })
      .where(eq(schema.investigations.id, investigation.id));
    await logActivity({ disputeId, actor: "agent", type: "investigation.failed", message: `Investigation failed: ${message}` });
    throw err;
  }
}
