/** Verifies the database connection and shows row counts.  npm run db:check */
import { count, sql } from "drizzle-orm";
import { describeError } from "../lib/errors";
import { closeDb, getDb, schema } from "../lib/db";
import { loadLocalEnv } from "../lib/env";

async function main() {
  loadLocalEnv();
  const db = getDb();
  const [{ now, version }] = (
    await db.execute<{ now: string; version: string }>(sql`select now()::text as now, version() as version`)
  ).rows;
  console.log(`\n✔ Connected: ${version.split(",")[0]}`);
  console.log(`  Server time: ${now}\n`);

  const tables = {
    disputes: schema.disputes,
    investigations: schema.investigations,
    decisions: schema.decisions,
    rules: schema.rules,
    activity_log: schema.activityLog,
  };
  for (const [name, table] of Object.entries(tables)) {
    const [{ value }] = await db.select({ value: count() }).from(table);
    console.log(`  ${name.padEnd(16)} ${value} rows`);
  }
  console.log();
}

main()
  .catch((err) => {
    console.error(`\n✖ ${describeError(err)}\n`);
    process.exitCode = 1;
  })
  .finally(closeDb);
