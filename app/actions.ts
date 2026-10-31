"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/lib/db";
import { describeError } from "@/lib/errors";
import { parseRule } from "@/lib/policy/parse-rule";
import { upsertRule } from "@/lib/policy/rules-store";
import type { ParsedRule } from "@/lib/policy/types";
import { logActivity } from "@/lib/services/activity";
import { executeDecision } from "@/lib/services/execute-decision";
import { startInvestigation } from "@/lib/services/process-dispute";
import { syncDispute, syncDisputes } from "@/lib/services/sync";

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

export async function syncAction(): Promise<ActionResult> {
  try {
    const { total, created } = await syncDisputes();
    revalidatePath("/", "layout");
    return { ok: true, message: `Synced ${total} disputes (${created.length} new).` };
  } catch (err) {
    return { ok: false, message: describeError(err) };
  }
}

export async function investigateAction(disputeId: string) {
  // Don't reopen a case you have already approved or rejected.
  const [latest] = await getDb()
    .select({ status: schema.decisions.status })
    .from(schema.decisions)
    .where(eq(schema.decisions.disputeId, disputeId))
    .orderBy(desc(schema.decisions.createdAt))
    .limit(1);
  if (!latest || latest.status === "pending_approval" || latest.status === "failed") {
    try {
      await startInvestigation(disputeId);
    } catch (err) {
      await logActivity({ disputeId, actor: "system", type: "investigation.blocked", message: describeError(err) });
    }
  }
  revalidatePath("/", "layout");
  redirect(`/disputes/${encodeURIComponent(disputeId)}`);
}

async function resolveDecision(decisionId: number, status: "approved" | "rejected") {
  const db = getDb();
  const [decision] = await db
    .update(schema.decisions)
    .set({ status, resolvedAt: new Date() })
    .where(eq(schema.decisions.id, decisionId))
    .returning();
  if (!decision) throw new Error("Decision not found.");

  await logActivity({
    disputeId: decision.disputeId,
    actor: "seller",
    type: status === "approved" ? "decision.approved" : "decision.rejected",
    message:
      status === "approved"
        ? `You approved: ${decision.action ?? "the recommendation"}`
        : "You rejected the agent's recommendation",
    data: { decisionId },
  });
  revalidatePath("/", "layout");
}

export async function approveDecisionAction(
  decisionId: number,
  responseText?: string,
  chosenAction?: "fight" | "refund",
): Promise<ActionResult> {
  try {
    // When the agent left the call to you, your choice becomes the action.
    if (chosenAction) {
      await getDb().update(schema.decisions).set({ action: chosenAction }).where(eq(schema.decisions.id, decisionId));
    }
    await resolveDecision(decisionId, "approved");
    const execution = await executeDecision(decisionId, responseText);
    revalidatePath("/", "layout");
    return execution.ok ? { ok: true, message: execution.detail } : { ok: false, message: execution.detail };
  } catch (err) {
    revalidatePath("/", "layout");
    return { ok: false, message: describeError(err) };
  }
}

export async function rejectDecisionAction(decisionId: number) {
  await resolveDecision(decisionId, "rejected");
}

export async function previewRuleAction(text: string): Promise<{ ok: true; rule: ParsedRule } | { ok: false; message: string }> {
  const trimmed = text.trim();
  if (trimmed.length < 8) return { ok: false, message: "Describe the rule in a few words." };
  if (trimmed.length > 300) return { ok: false, message: "Keep the rule under 300 characters." };
  try {
    return { ok: true, rule: await parseRule(trimmed) };
  } catch (err) {
    return { ok: false, message: describeError(err) };
  }
}

export async function saveRuleAction(text: string, rule: ParsedRule): Promise<ActionResult> {
  try {
    const id = `rule-${Date.now().toString(36)}`;
    await upsertRule({ ...rule, id, text: text.trim(), enabled: true });
    await logActivity({ actor: "seller", type: "rule.created", message: `Added rule: “${text.trim()}”` });
    revalidatePath("/rules");
    return { ok: true, message: "Rule saved." };
  } catch (err) {
    return { ok: false, message: describeError(err) };
  }
}

export async function toggleRuleAction(ruleId: string, enabled: boolean) {
  await getDb().update(schema.rules).set({ enabled }).where(eq(schema.rules.id, ruleId));
  revalidatePath("/rules");
}

/** Sends an approved (or previously failed) decision to PayPal. */
export async function sendDecisionAction(decisionId: number): Promise<ActionResult> {
  try {
    const db = getDb();
    await db
      .update(schema.decisions)
      .set({ status: "approved" })
      .where(eq(schema.decisions.id, decisionId));
    const execution = await executeDecision(decisionId);
    revalidatePath("/", "layout");
    return { ok: execution.ok, message: execution.detail };
  } catch (err) {
    revalidatePath("/", "layout");
    return { ok: false, message: describeError(err) };
  }
}

/** Imports one dispute by its ID (PayPal's dispute list can lag a few minutes behind). */
export async function importDisputeAction(rawId: string): Promise<ActionResult> {
  const id = rawId.trim();
  if (!/^PP-[A-Z0-9-]{6,40}$/i.test(id)) return { ok: false, message: "Enter a PayPal dispute ID like PP-R-ABC-12345678." };
  try {
    const db = getDb();
    const [existing] = await db.select({ id: schema.disputes.id }).from(schema.disputes).where(eq(schema.disputes.id, id)).limit(1);
    const row = await syncDispute(id);
    if (!existing) {
      await logActivity({
        disputeId: id,
        actor: "system",
        type: "dispute.received",
        message: `New dispute from ${row.buyerName ?? "a buyer"}: ${row.amount} ${row.currency}`,
      });
    }
  } catch (err) {
    return { ok: false, message: describeError(err) };
  }
  revalidatePath("/", "layout");
  redirect(`/disputes/${encodeURIComponent(id)}`);
}

export async function deleteRuleAction(ruleId: string) {
  const [rule] = await getDb().delete(schema.rules).where(eq(schema.rules.id, ruleId)).returning();
  if (rule) await logActivity({ actor: "seller", type: "rule.deleted", message: `Removed rule: “${rule.text}”` });
  revalidatePath("/rules");
}
