/**
 * Shows how the AI understands a plain-English rule.
 *   npm run rule -- "Fight automatically if it was delivered and is under $50"
 */
import { loadLocalEnv } from "../lib/env";
import { parseRule } from "../lib/policy/parse-rule";

async function main() {
  loadLocalEnv();
  const text = process.argv.slice(2).join(" ").trim();
  if (!text) throw new Error('Pass a rule, e.g. npm run rule -- "Refund lost parcels under $20"');

  const rule = await parseRule(text);
  console.log(`\n📝 "${text}"\n`);
  console.log(`Understood as: ${rule.explanation}`);
  console.log(JSON.stringify({ conditions: rule.conditions, action: rule.action }, null, 2));
  if (rule.unsupported) console.log(`\n⚠️  Not supported: ${rule.unsupported}`);
  console.log();
}

main().catch((err) => {
  console.error(`\n✖ ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
