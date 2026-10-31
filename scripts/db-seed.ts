/** Seeds the starter rules from data/rules.json into the database.  npm run db:seed */
import { closeDb } from "../lib/db";
import { describeError } from "../lib/errors";
import { loadLocalEnv } from "../lib/env";
import { loadDefaultRules, upsertRule } from "../lib/policy/rules-store";

async function main() {
  loadLocalEnv();
  const rules = await loadDefaultRules();
  for (const rule of rules) await upsertRule(rule);
  console.log(`\n✔ Seeded ${rules.length} rules.\n`);
}

main()
  .catch((err) => {
    console.error(`\n✖ ${describeError(err)}\n`);
    process.exitCode = 1;
  })
  .finally(closeDb);
