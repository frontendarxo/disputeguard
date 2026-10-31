import { ActivityFeed } from "@/components/activity-feed";
import { getActivity } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const { entries, disputeInfo } = await getActivity();
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 sm:px-8">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Activity log</h1>
        <p className="mt-1.5 text-muted">Everything the agent, the system and you have done, grouped by dispute.</p>
      </div>
      <section className="rounded-xl border border-line bg-white p-5">
        <ActivityFeed entries={entries} disputes={disputeInfo} now={Date.now()} limit={100} />
      </section>
    </main>
  );
}
