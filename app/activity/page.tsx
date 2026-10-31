import { ActivityList } from "@/components/activity-list";
import { getActivity } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const entries = await getActivity(100);
  return (
    <main className="mx-auto flex max-w-[960px] flex-col gap-6 px-4 py-8 sm:px-8">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Activity log</h1>
        <p className="mt-1.5 text-muted">Everything the agent, the system and you have done.</p>
      </div>
      <section className="rounded-xl border border-line bg-white p-6">
        <ActivityList entries={entries} now={Date.now()} />
      </section>
    </main>
  );
}
