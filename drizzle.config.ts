import { defineConfig } from "drizzle-kit";
import { normalizeDatabaseUrl } from "./lib/db/url";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Use variables from the environment (e.g. on Render).
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (see .env.example).");
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: normalizeDatabaseUrl(process.env.DATABASE_URL) },
});
