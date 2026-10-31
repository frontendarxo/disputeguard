import { toneClasses, type DisputeStatus } from "@/lib/ui/status";

export function StatusChip({ status }: { status: DisputeStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[status.tone]}`}>
      {status.label}
    </span>
  );
}
