/** Pulls disputes from PayPal into the database.  npm run sync */
import { closeDb } from "../lib/db";
import { describeError } from "../lib/errors";
import { loadLocalEnv } from "../lib/env";
import { syncDisputes } from "../lib/services/sync";

async function main() {
  loadLocalEnv();
  const { total, created } = await syncDisputes();
  console.log(`\n✔ Synced ${total} disputes from PayPal (${created.length} new).`);
  for (const id of created) console.log(`  + ${id}`);
  console.log();
}

main()
  .catch((err) => {
    console.error(`\n✖ ${describeError(err)}\n`);
    process.exitCode = 1;
  })
  .finally(closeDb);
