/**
 * Models sometimes send a list as a JSON-encoded string (e.g. keyFacts: "[{...}]").
 * Decode such fields before validating instead of failing the whole investigation.
 */
export function normalizeAssessmentInput(input: unknown): unknown {
  if (typeof input === "string") {
    try {
      return normalizeAssessmentInput(JSON.parse(input));
    } catch {
      return input;
    }
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const out: Record<string, unknown> = { ...(input as Record<string, unknown>) };
  for (const key of ["keyFacts", "evidence", "risks"]) {
    const value = out[key];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) out[key] = parsed;
      } catch {
        if (key === "risks") out[key] = value.trim() ? [value] : [];
      }
    }
  }
  if (typeof out.confidence === "string" && !Number.isNaN(Number(out.confidence))) out.confidence = Number(out.confidence);
  return out;
}
