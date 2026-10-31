import Link from "next/link";
import { friendlyMessage, groupActivity, entryTone, type ActivityEntry, type DisputeInfo } from "@/lib/ui/activity";
import { money, reasonLabel, relativeTime } from "@/lib/ui/format";
import { toneClasses, type Tone } from "@/lib/ui/status";

const DOT: Record<Tone, string> = {
  ok: "bg-ok-strong",
  warn: "bg-orange-600",
  danger: "bg-danger",
  info: "bg-accent",
  neutral: "bg-gray-400",
};

/** Agent work grouped by dispute: one card per case with its outcome and step trail. */
export function ActivityFeed({
  entries,
  disputes,
  now,
  limit = 6,
}: {
  entries: ActivityEntry[];
  disputes: Record<string, DisputeInfo>;
  now: number;
  limit?: number;
}) {
  const groups = groupActivity(entries, limit);
  if (groups.length === 0) return <p className="text-muted">Nothing yet. New disputes will show up here as the agent works on them.</p>;

  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {groups.map((g) => {
        const d = g.disputeId ? disputes[g.disputeId] : undefined;
        const title = d ? `${d.buyer} · ${money(d.amount, d.currency)}` : g.key.endsWith("rules") ? "Your rules" : "System";
        const subtitle = d ? reasonLabel(d.reason) : null;
        const body = (
          <>
            <div className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">{title}</span>
                {subtitle && <span className="text-xs text-muted">{subtitle}</span>}
              </span>
              <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[g.outcome.tone]}`}>
                {g.outcome.label}
              </span>
            </div>
            <ol className="mt-3 flex flex-col gap-1.5 border-l border-line pl-3">
              {g.entries.slice(-4).map((e) => (
                <li key={e.id} className="relative text-[13px] leading-snug text-body">
                  <span className={`absolute -left-[17px] top-1.5 size-2 rounded-full ${DOT[entryTone(e.type)]}`} aria-hidden="true" />
                  {friendlyMessage(e)}
                </li>
              ))}
            </ol>
            <span className="mt-2 block text-xs text-muted">{relativeTime(g.at, now)}</span>
          </>
        );
        return (
          <li key={g.key}>
            {g.disputeId ? (
              <Link
                href={`/disputes/${encodeURIComponent(g.disputeId)}`}
                className="block h-full rounded-[10px] border border-line p-3.5 text-ink no-underline transition-colors hover:border-gray-300 hover:bg-subtle"
              >
                {body}
              </Link>
            ) : (
              <div className="h-full rounded-[10px] border border-line p-3.5">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
