export function money(amount: number | string, currency = "USD") {
  const value = typeof amount === "string" ? Number(amount) : amount;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function shortDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(date));
}

export function shortDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(date));
}

export function relativeTime(date: Date | string | null | undefined, now = Date.now()) {
  if (!date) return "";
  const diff = Math.round((now - new Date(date).getTime()) / 1000);
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
  return `${Math.round(diff / 86400)} d ago`;
}

/** Days until a deadline (negative if past). */
export function daysUntil(date: Date | string | null | undefined, now = Date.now()) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - now) / 86_400_000);
}

const REASONS: Record<string, string> = {
  MERCHANDISE_OR_SERVICE_NOT_RECEIVED: "Item not received",
  MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED: "Not as described",
  UNAUTHORISED: "Unauthorized payment",
  CREDIT_NOT_PROCESSED: "Credit not processed",
  DUPLICATE_TRANSACTION: "Duplicate charge",
  INCORRECT_AMOUNT: "Incorrect amount",
  PAYMENT_BY_OTHER_MEANS: "Paid by other means",
  CANCELED_RECURRING_BILLING: "Canceled subscription",
  PROBLEM_WITH_REMITTANCE: "Remittance problem",
  OTHER: "Other",
};

export function reasonLabel(reason: string) {
  return REASONS[reason] ?? reason.replaceAll("_", " ").toLowerCase();
}

export function titleCase(value: string | null | undefined) {
  if (!value) return "—";
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
}
