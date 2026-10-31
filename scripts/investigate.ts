/**
 * Runs the AI agent on one dispute and prints each step live.
 *   npm run investigate                       -> newest dispute
 *   npm run investigate -- PP-R-TDW-10195416  -> a specific dispute
 */
import { investigateDispute } from "../lib/agent/investigate";
import { describeError } from "../lib/errors";
import { loadLocalEnv } from "../lib/env";
import { listDisputes } from "../lib/paypal/disputes";

function short(value: unknown, max = 160) {
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

async function main() {
  loadLocalEnv();

  let disputeId = process.argv[2];
  if (!disputeId) {
    const disputes = await listDisputes(10);
    if (disputes.length === 0) throw new Error("No disputes found in the sandbox.");
    disputeId = disputes[0].dispute_id;
  }

  console.log(`\n🔎 Investigating ${disputeId}…\n`);
  const started = Date.now();

  const result = await investigateDispute(disputeId, {
    onStep: (step) => {
      if (step.text.trim()) console.log(`💭 ${short(step.text, 300)}`);
      for (const call of step.toolCalls) {
        if (call.tool === "submit_assessment") continue;
        console.log(`🛠  ${call.tool}(${short(call.input, 120)})`);
      }
      for (const r of step.toolResults) {
        if (r.tool === "submit_assessment") continue;
        console.log(`   ↳ ${short(r.output)}`);
      }
    },
  });

  const a = result.assessment;
  const icon = { fight: "🛡  FIGHT", refund: "↩️  REFUND", needs_human: "🙋 NEEDS HUMAN" }[a.recommendation];
  console.log(`\n────────────────────────────────────────`);
  console.log(`${icon}   confidence ${Math.round(a.confidence * 100)}%   (${result.model}, ${((Date.now() - started) / 1000).toFixed(1)}s)`);
  console.log(`────────────────────────────────────────\n`);
  console.log(a.summary, "\n");
  console.log("Key facts:");
  for (const f of a.keyFacts) console.log(`  • ${f.fact}  [${f.source}]`);
  console.log("\nEvidence:");
  for (const e of a.evidence) console.log(`  ${e.available ? "✔" : "✖"} ${e.type}: ${e.description}`);
  if (a.risks.length) {
    console.log("\nRisks:");
    for (const r of a.risks) console.log(`  ! ${r}`);
  }
  console.log("\nDraft response:\n");
  console.log(a.draftResponse, "\n");
}

main().catch((err) => {
  console.error(`\n✖ ${describeError(err)}\n`);
  process.exit(1);
});
