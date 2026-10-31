/**
 * Full loop without the UI: investigate a dispute, then let the policy engine decide.
 *   npm run decide -- PP-R-TDW-10195416
 */
import { investigateDispute } from "../lib/agent/investigate";
import { loadLocalEnv } from "../lib/env";
import { getDispute, listDisputes } from "../lib/paypal/disputes";
import { evaluatePolicy } from "../lib/policy/engine";
import { loadRules } from "../lib/policy/rules-store";
import { DEFAULT_GUARDRAILS } from "../lib/policy/types";

async function main() {
  loadLocalEnv();

  let disputeId = process.argv[2];
  if (!disputeId) {
    const disputes = await listDisputes(10);
    if (disputes.length === 0) throw new Error("No disputes found in the sandbox.");
    disputeId = disputes[0].dispute_id;
  }

  console.log(`\n🔎 Investigating ${disputeId}…`);
  const [dispute, rules, result] = await Promise.all([
    getDispute(disputeId),
    loadRules(),
    investigateDispute(disputeId, {
      onStep: (s) => s.toolCalls.forEach((c) => c.tool !== "submit_assessment" && console.log(`   🛠  ${c.tool}`)),
    }),
  ]);
  const a = result.assessment;

  const decision = evaluatePolicy(
    {
      reason: dispute.reason,
      amount: Number(dispute.dispute_amount?.value ?? 0),
      currency: dispute.dispute_amount?.currency_code ?? "USD",
      stage: dispute.dispute_life_cycle_stage ?? "UNKNOWN",
      recommendation: a.recommendation,
      confidence: a.confidence,
      deliveryStatus: a.deliveryStatus,
    },
    rules,
    DEFAULT_GUARDRAILS,
  );

  console.log(`\n🤖 Agent: ${a.recommendation.toUpperCase()} · ${Math.round(a.confidence * 100)}% · delivery: ${a.deliveryStatus}`);
  console.log(`   ${a.summary}\n`);
  console.log("⚖️  Policy checks:");
  for (const c of decision.checks) console.log(`   ${c.passed ? "✔" : "✖"} ${c.label}`);
  console.log(
    `\n${decision.mode === "auto" ? "⚡ AUTO" : "🙋 APPROVAL NEEDED"} → ${decision.action ?? "no action"}\n   ${decision.reason}\n`,
  );
}

main().catch((err) => {
  console.error(`\n✖ ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
