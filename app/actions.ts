"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/lib/db";
import { describeError } from "@/lib/errors";
import { parseRule } from "@/lib/policy/parse-rule";
import { loadDefaultRules, upsertRule } from "@/lib/policy/rules-store";
import type { ParsedRule } from "@/lib/policy/types";
import { logActivity } from "@/lib/services/activity";
import { executeDecision } from "@/lib/services/execute-decision";
import { startInvestigation } from "@/lib/services/process-dispute";
import { autoInvestigateEnabled, syncDisputes } from "@/lib/services/sync";

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

export async function syncAction(): Promise<ActionResult> {
  try {
    const { total, created } = await syncDisputes();
    if (autoInvestigateEnabled()) {
      for (const id of created) await startInvestigation(id).catch((err) => console.error("[auto-investigate]", err));
    }
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

/** Only a decision that is waiting for you can be approved or rejected (no double clicks, no undoing a sent action). */
async function resolveDecision(decisionId: number, status: "approved" | "rejected", chosenAction?: "fight" | "refund") {
  const db = getDb();
  const [decision] = await db
    .update(schema.decisions)
    .set({ status, resolvedAt: new Date(), ...(chosenAction ? { action: chosenAction } : {}) })
    .where(and(eq(schema.decisions.id, decisionId), eq(schema.decisions.status, "pending_approval")))
    .returning();
  if (!decision) throw new Error("This decision was already handled.");

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
    await resolveDecision(decisionId, "approved", chosenAction);
    const execution = await executeDecision(decisionId, responseText);
    revalidatePath("/", "layout");
    return execution.ok ? { ok: true, message: execution.detail } : { ok: false, message: execution.detail };
  } catch (err) {
    revalidatePath("/", "layout");
    return { ok: false, message: describeError(err) };
  }
}

export async function rejectDecisionAction(decisionId: number) {
  await resolveDecision(decisionId, "rejected").catch(() => revalidatePath("/", "layout"));
}

// Rule parsing calls the AI; cap it so the public demo can't run up costs.
const ruleParses: number[] = [];
function allowRuleParse(limit = 30) {
  const hourAgo = Date.now() - 3_600_000;
  while (ruleParses.length && ruleParses[0] < hourAgo) ruleParses.shift();
  if (ruleParses.length >= limit) return false;
  ruleParses.push(Date.now());
  return true;
}

export async function previewRuleAction(text: string): Promise<{ ok: true; rule: ParsedRule } | { ok: false; message: string }> {
  const trimmed = text.trim();
  if (trimmed.length < 8) return { ok: false, message: "Describe the rule in a few words." };
  if (trimmed.length > 300) return { ok: false, message: "Keep the rule under 300 characters." };
  if (!allowRuleParse()) return { ok: false, message: "Too many rule previews this hour. Try again later." };
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
    // Only an approved or failed decision can be (re)sent.
    await db
      .update(schema.decisions)
      .set({ status: "approved" })
      .where(and(eq(schema.decisions.id, decisionId), inArray(schema.decisions.status, ["approved", "failed"])));
    const execution = await executeDecision(decisionId);
    revalidatePath("/", "layout");
    return { ok: execution.ok, message: execution.detail };
  } catch (err) {
    revalidatePath("/", "layout");
    return { ok: false, message: describeError(err) };
  }
}

export async function deleteRuleAction(ruleId: string) {
  const [rule] = await getDb().delete(schema.rules).where(eq(schema.rules.id, ruleId)).returning();
  if (rule) await logActivity({ actor: "seller", type: "rule.deleted", message: `Removed rule: “${rule.text}”` });
  revalidatePath("/rules");
}

/** Puts the starter rules back (handy on the public demo, where anyone can edit rules). */
export async function restoreStarterRulesAction() {
  for (const rule of await loadDefaultRules()) await upsertRule(rule);
  await logActivity({ actor: "seller", type: "rule.created", message: "Restored the starter rules" });
  revalidatePath("/rules");
}
