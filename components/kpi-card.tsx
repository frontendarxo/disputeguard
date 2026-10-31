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
  tone?: "default" | "ok" | "warn";
  children?: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 rounded-xl border bg-white p-5 ${tone === "warn" ? "border-warn-line" : "border-line"}`}>
      <span className={tone === "warn" ? "font-semibold text-warn" : "font-medium text-muted"}>{label}</span>
      <span className={`text-[28px] font-bold tracking-tight ${tone === "ok" ? "text-ok-strong" : ""}`}>{value}</span>
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
      {children}
    </div>
  );
}
