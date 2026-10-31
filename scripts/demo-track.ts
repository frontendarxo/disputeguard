/**
 * Demo helper: attaches sandbox tracking to the payment behind a dispute.
 *   npm run demo:track -- PP-R-XXX-123 delivered
 *   npm run demo:track -- PP-R-XXX-123 shipped
 */
import { loadLocalEnv } from "../lib/env";
import { describeError } from "../lib/errors";
import { getDispute } from "../lib/paypal/disputes";
import { addTracking, type TrackerStatus } from "../lib/paypal/tracking";

async function main() {
  loadLocalEnv();
  const [disputeId, statusArg = "delivered"] = process.argv.slice(2);
  if (!disputeId) throw new Error("Usage: npm run demo:track -- <dispute id> [delivered|shipped]");

  const status = statusArg.toUpperCase() as TrackerStatus;
  if (!["DELIVERED", "SHIPPED"].includes(status)) throw new Error("Status must be delivered or shipped.");

  const dispute = await getDispute(disputeId);
  const transactionId = dispute.disputed_transactions?.[0]?.seller_transaction_id;
  if (!transactionId) throw new Error("This dispute has no seller transaction.");

  const trackingNumber = `1ZDEMO${Math.floor(Math.random() * 1e10).toString().padStart(10, "0")}`;
  await addTracking(transactionId, trackingNumber, status);
  console.log(`\n✔ Added ${status} tracking ${trackingNumber} (UPS) to transaction ${transactionId}.\n`);
}

main().catch((err) => {
  console.error(`\n✖ ${describeError(err)}\n`);
  process.exitCode = 1;
});
