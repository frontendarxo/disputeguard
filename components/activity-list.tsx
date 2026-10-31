import { relativeTime } from "@/lib/ui/format";

type Entry = { id: number; actor: string; type: string; message: string; createdAt: Date };

const DOT: Record<string, string> = {
  agent: "bg-accent",
  seller: "bg-ok-strong",
  system: "bg-gray-400",
};

export function ActivityList({ entries, now }: { entries: Entry[]; now: number }) {
  if (entries.length === 0) return <p className="text-muted">Nothing yet.</p>;
  return (
    <ol className="flex flex-col gap-4">
      {entries.map((e) => (
        <li key={e.id} className="flex gap-3">
          <span
            className={`mt-1 size-2.5 flex-shrink-0 rounded-full ${e.type.includes("approval") ? "bg-orange-600" : (DOT[e.actor] ?? "bg-gray-400")}`}
            aria-hidden="true"
          />
          <span className="flex flex-col gap-0.5">
            <span>{e.message}</span>
            <span className="text-xs text-muted">
              {e.actor === "seller" ? "You" : e.actor === "agent" ? "Agent" : "System"} · {relativeTime(e.createdAt, now)}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
