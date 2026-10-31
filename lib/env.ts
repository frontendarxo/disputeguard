/** Loads .env.local for standalone scripts (Next.js does this by itself). */
export function loadLocalEnv() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Fall back to variables already present in the environment.
  }
}
