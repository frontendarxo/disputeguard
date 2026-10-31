/**
 * Neon connection strings use sslmode=require. node-postgres already treats it as
 * verify-full and prints a deprecation warning, so we make that explicit.
 */
export function normalizeDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    const mode = u.searchParams.get("sslmode");
    if (!mode || mode === "require" || mode === "prefer" || mode === "verify-ca") {
      u.searchParams.set("sslmode", "verify-full");
    }
    return u.toString();
  } catch {
    return url;
  }
}
