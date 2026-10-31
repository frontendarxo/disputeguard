/**
 * SANDBOX demo helper: makes PayPal ask the seller for evidence on a dispute
 * (UNDER_REVIEW → WAITING_FOR_SELLER_RESPONSE), so evidence can be submitted.
 *   npm run demo:request-evidence -- PP-R-XXX-123
 */
import { loadLocalEnv } from "../lib/env";
import { describeError } from "../lib/errors";
import { getPayPalConfig } from "../lib/paypal/client";
import { simulateEvidenceRequest } from "../lib/paypal/dispute-actions";
import { allowedActions, getDispute } from "../lib/paypal/disputes";

async function main() {
  loadLocalEnv();
  if (getPayPalConfig().env !== "sandbox") throw new Error("This helper only works in the sandbox.");
  const disputeId = process.argv[2];
  if (!disputeId) throw new Error("Usage: npm run demo:request-evidence -- <dispute id>");

  const before = await getDispute(disputeId);
  const allowed = allowedActions(before);
  console.log(`\nBefore: ${before.status} / ${before.dispute_life_cycle_stage}`);
  console.log(`PayPal allows: ${[...allowed].filter((r) => r !== "self").join(", ") || "nothing"}`);
  if (!allowed.has("require_evidence")) {
    throw new Error("PayPal doesn't offer the sandbox 'require-evidence' action for this dispute.");
  }
  await simulateEvidenceRequest(disputeId);
  const after = await getDispute(disputeId);
  console.log(`After:  ${after.status} / ${after.dispute_life_cycle_stage}`);
  console.log(`Seller response due: ${after.seller_response_due_date ?? "-"}\n`);
}

main().catch((err) => {
  console.error(`\n✖ ${describeError(err)}\n`);
  process.exitCode = 1;
});
