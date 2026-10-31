/**
 * Connection check: authenticates with the PayPal sandbox and lists disputes.
 * Run with:  npm run check:paypal
 */
import { PayPalApiError, PayPalConfigError, getAccessToken, getPayPalConfig } from "../lib/paypal/client";
import { getDispute, listDisputes } from "../lib/paypal/disputes";

function loadEnv() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Fall back to variables already present in the environment.
  }
}

async function main() {
  loadEnv();

  const { env, baseUrl } = getPayPalConfig();
  console.log(`\n▶ Environment: ${env} (${baseUrl})`);

  await getAccessToken();
  console.log("✔ Access token received — credentials are valid.");

  const disputes = await listDisputes();
  console.log(`✔ Disputes found: ${disputes.length}\n`);

  if (disputes.length === 0) {
    console.log(
      "No disputes yet. New disputes can take a few minutes to appear in the API — try again shortly.",
    );
    return;
  }

  console.table(
    disputes.map((d) => ({
      id: d.dispute_id,
      reason: d.reason,
      status: d.status,
      stage: d.dispute_life_cycle_stage ?? "-",
      amount: d.dispute_amount ? `${d.dispute_amount.value} ${d.dispute_amount.currency_code}` : "-",
      created: d.create_time,
    })),
  );

  const first = await getDispute(disputes[0].dispute_id);
  const tx = first.disputed_transactions?.[0];
  console.log(`\nDetails of ${first.dispute_id}:`);
  console.log(`  Reason:               ${first.reason}`);
  console.log(`  Status / stage:       ${first.status} / ${first.dispute_life_cycle_stage ?? "-"}`);
  console.log(`  Seller response due:  ${first.seller_response_due_date ?? "-"}`);
  console.log(`  Seller transaction:   ${tx?.seller_transaction_id ?? "-"}`);
  console.log(`  Items:                ${tx?.items?.map((i) => i.item_name).join(", ") || "-"}`);
  console.log(`  Messages:             ${first.messages?.length ?? 0}`);
  console.log("\n✔ PayPal connection works.\n");
}

main().catch((err) => {
  if (err instanceof PayPalConfigError) {
    console.error(`\n✖ Config error: ${err.message}\n`);
  } else if (err instanceof PayPalApiError) {
    console.error(`\n✖ ${err.message}`);
    if (err.status === 401) {
      console.error("  Check PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET in .env.local (Sandbox credentials of the DisputeGuard app).");
    }
    if (err.debugId) console.error(`  PayPal debug id: ${err.debugId}`);
    if (err.details) console.error("  Details:", JSON.stringify(err.details, null, 2));
    console.error();
  } else {
    console.error(err);
  }
  process.exit(1);
});
