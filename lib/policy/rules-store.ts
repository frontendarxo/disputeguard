import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ruleSchema, type Rule } from "./types";

const RULES_FILE = path.join(process.cwd(), "data", "rules.json");

/** Temporary file-based store; will move to the database. */
export async function loadRules(): Promise<Rule[]> {
  const raw = await readFile(RULES_FILE, "utf8");
  return z.array(ruleSchema).parse(JSON.parse(raw));
}
