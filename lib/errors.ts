/** Human-readable error text, including the underlying cause (e.g. a Postgres error behind a Drizzle query). */
export function describeError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const cause = (err as { cause?: unknown }).cause;
  const causeText = cause instanceof Error ? cause.message : cause ? String(cause) : "";
  const message = err.message.startsWith("Failed query") ? err.message.split("\n")[0] : err.message;
  let text = causeText ? `${message}\n  Cause: ${causeText}` : message;
  if (/relation .* does not exist/.test(causeText)) {
    text += "\n  → Tables are missing. Run: npm run db:push";
  }
  return text;
}
