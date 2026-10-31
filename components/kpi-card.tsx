export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
  children,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  /** Colors only mean something when there is something to see: zero stays neutral. */
  tone?: "default" | "ok" | "warn";
  children?: React.ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-2 rounded-xl border bg-white p-4 sm:p-5 ${tone === "warn" ? "border-warn-line" : "border-line"}`}>
      <span className={tone === "warn" ? "font-semibold text-warn" : "font-medium text-muted"}>{label}</span>
      <span className={`text-[22px] font-bold tracking-tight sm:text-[28px] ${tone === "ok" ? "text-ok-strong" : ""}`}>{value}</span>
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
      {children}
    </div>
  );
}
