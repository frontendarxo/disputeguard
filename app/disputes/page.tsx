import { DisputesGrid } from "@/components/disputes-grid";
import { SyncButton } from "@/components/sync-button";
import { getDisputeRows } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DisputesPage() {
  const rows = await getDisputeRows();
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[26px] font-bold tracking-tight">Disputes</h1>
        <SyncButton />
      </div>
      <DisputesGrid rows={rows} />
    </main>
  );
}
