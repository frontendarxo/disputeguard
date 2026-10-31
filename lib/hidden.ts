/**
 * Disputes left out of the app (e.g. early test cases on the demo account).
 * HIDDEN_DISPUTES is a comma-separated list of dispute IDs or ID fragments, e.g. "KMV,XOA".
 * Hidden disputes stay in PayPal; the app just doesn't show or process them.
 */
export function isHiddenDispute(id: string | null | undefined, env = process.env.HIDDEN_DISPUTES) {
  if (!id || !env) return false;
  return env
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .some((part) => id === part || id.includes(part));
}
