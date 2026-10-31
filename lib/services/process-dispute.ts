import { and, eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import { investigateDispute, type AgentStepEvent } from "../agent/investigate";
import { evaluatePolicy } from "../policy/engine";
import { loadRules } from "../policy/rules-store";
import { DEFAULT_GUARDRAILS, type DeliveryStatus } from "../policy/types";
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
