/**
 * Full pipeline with storage: sync → investigate → decide → save.
 *   npm run process -- PP-R-TDW-10195416
 */
import { closeDb } from "../lib/db";
import { describeError } from "../lib/errors";
import { loadLocalEnv } from "../lib/env";
import { listDisputes } from "../lib/paypal/disputes";
import { processDispute } from "../lib/services/process-dispute";

async function main() {
  loadLocalEnv();
  let disputeId = process.argv[2];
  if (!disputeId) {
    const disputes = await listDisputes(10);
    if (disputes.length === 0) throw new Error("No disputes found in the sandbox.");
    disputeId = disputes[0].dispute_id;
  }

  console.log(`\n🔎 Processing ${disputeId}…`);
  const { assessment: a, decision, investigationId } = await processDispute(disputeId, {
    onStep: (s) => s.toolCalls.forEach((c) => c.tool !== "submit_assessment" && console.log(`   🛠  ${c.tool}`)),
  });

  console.log(`\n🤖 ${a.recommendation.toUpperCase()} · ${Math.round(a.confidence * 100)}% · delivery: ${a.deliveryStatus}`);
  for (const c of decision.checks) console.log(`   ${c.passed ? "✔" : "✖"} ${c.label}`);
  console.log(`\n${decision.mode === "auto" ? "⚡ AUTO" : "🙋 APPROVAL NEEDED"} → ${decision.reason}`);
  console.log(`\n💾 Saved: investigation #${investigationId}, decision #${decision.id} (${decision.status})\n`);
}

main()
  .catch((err) => {
    console.error(`\n✖ ${describeError(err)}\n`);
    process.exitCode = 1;
  })
  .finally(closeDb);
