import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { normalizeDatabaseUrl } from "./url";

/**
 * One connection pool per process. Next.js dev reloads modules, so the pool is
 * cached on globalThis. Uses the Neon pooled connection string from DATABASE_URL.
 */
const globalForDb = globalThis as unknown as { pgPool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set (see .env.example).");
  }
  return new Pool({ connectionString: normalizeDatabaseUrl(connectionString), max: 5, idleTimeoutMillis: 30_000 });
}

let instance: NodePgDatabase<typeof schema> | null = null;

export function getDb() {
  if (!instance) {
    globalForDb.pgPool ??= createPool();
    instance = drizzle(globalForDb.pgPool, { schema });
  }
  return instance;
}

export async function closeDb() {
  await globalForDb.pgPool?.end();
  globalForDb.pgPool = undefined;
  instance = null;
}

export { schema };
