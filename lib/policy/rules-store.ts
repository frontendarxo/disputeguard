import { readFile } from "node:fs/promises";
import path from "node:path";
import { asc } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../db";
import { ruleSchema, type Rule } from "./types";

const DEFAULT_RULES_FILE = path.join(process.cwd(), "data", "rules.json");

/** Starter rules shipped with the repo (used to seed the database). */
export async function loadDefaultRules(): Promise<Rule[]> {
  const raw = await readFile(DEFAULT_RULES_FILE, "utf8");
  return z.array(ruleSchema).parse(JSON.parse(raw));
}

/** The seller's rules from the database. */
export async function loadRules(): Promise<Rule[]> {
  const rows = await getDb().select().from(schema.rules).orderBy(asc(schema.rules.createdAt));
  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    enabled: r.enabled,
    conditions: r.conditions,
    action: r.action,
    explanation: r.explanation,
    unsupported: r.unsupported ?? undefined,
  }));
}

export async function upsertRule(rule: Rule) {
  const values = {
    id: rule.id,
    text: rule.text,
    enabled: rule.enabled,
    conditions: rule.conditions,
    action: rule.action,
    explanation: rule.explanation,
    unsupported: rule.unsupported ?? null,
  };
  await getDb()
    .insert(schema.rules)
    .values(values)
    .onConflictDoUpdate({ target: schema.rules.id, set: values });
}
