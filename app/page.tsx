import Link from "next/link";
import { ActivityFeed } from "@/components/activity-feed";
import { AutoSync } from "@/components/auto-sync";
import { DecisionButtons } from "@/components/decision-buttons";
import { DisputesGrid } from "@/components/disputes-grid";
import { KpiCard } from "@/components/kpi-card";
import { SyncButton } from "@/components/sync-button";
import { getDashboardData } from "@/lib/queries";
import { money, reasonLabel } from "@/lib/ui/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { rows, kpis, approvals, activity, disputeInfo } = await getDashboardData();
  const now = Date.now();
  const autoPct = kpis.decidedCount ? Math.round((kpis.autoCount / kpis.decidedCount) * 100) : 0;

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 sm:px-8">
      <AutoSync />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">Disputes overview</h1>
          <p className="mt-1.5 text-muted">Your PayPal disputes, investigated by the agent and decided by your rules.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SyncButton />
          <Link
            href="/rules"
            className="flex min-h-10 items-center rounded-lg bg-accent px-4 font-semibold text-white no-underline hover:bg-accent-ink"
          >
            Edit agent rules
          </Link>
        </div>
      </div>

      <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Money at risk" value={money(kpis.atRisk, kpis.currency)} hint={`${kpis.openCount} open disputes`} />
        <KpiCard
          label="Protected by the agent"
          value={money(kpis.protected, kpis.currency)}
          hint={kpis.protectedCount ? `${kpis.protectedCount} claims won with evidence` : "No claims fought yet"}
          tone={kpis.protected > 0 ? "ok" : "default"}
        />
        <KpiCard
          label="Decided automatically"
          value={
            <>
              {kpis.autoCount} <span className="text-base font-medium text-muted">of {kpis.decidedCount}</span>
            </>
          }
        >
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-1.5 bg-accent" style={{ width: `${autoPct}%` }} />
          </div>
        </KpiCard>
        <KpiCard
          label="Awaiting your approval"
          value={kpis.awaitingCount}
          tone={kpis.awaitingCount > 0 ? "warn" : "default"}
          hint={kpis.awaitingCount ? <a href="#approvals" className="font-semibold">Review now</a> : "All caught up"}
        />
      </section>

      {approvals.length > 0 && (
        <section id="approvals" aria-labelledby="approve-title" className="flex flex-col gap-3.5 rounded-xl border border-warn-line bg-white p-5">
          <div className="flex items-center gap-2">
            <h2 id="approve-title" className="text-base font-semibold">
              Needs your approval
            </h2>
            <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">{kpis.awaitingCount}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {approvals.map(({ decision, dispute, assessment }) => (
              <div key={decision.id} className="flex flex-col gap-2.5 rounded-[10px] border border-line p-3.5">
                <div className="flex justify-between gap-2">
                  <span className="font-semibold">
                    {dispute.buyerName ?? "Buyer"} · {money(dispute.amount, dispute.currency)}
                  </span>
                  <span className="text-[13px] text-muted">{reasonLabel(dispute.reason)}</span>
                </div>
                <p className="text-body">
                  Agent suggests{" "}
                  <strong>{decision.action === "fight" ? "fighting" : decision.action === "refund" ? "a refund" : "your review"}</strong>
                  {assessment ? ` (${Math.round(assessment.confidence * 100)}% confident)` : ""}.{" "}
                  {decision.reason.replace("Needs your approval: ", "Needs you because ")}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <DecisionButtons decisionId={decision.id} action={decision.action} compact />
                  <Link href={`/disputes/${encodeURIComponent(dispute.id)}`} className="flex min-h-10 items-center px-2 font-semibold">
                    Review
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <DisputesGrid rows={rows} />

      <section aria-labelledby="activity-title" className="flex flex-col gap-3.5 rounded-xl border border-line bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="activity-title" className="text-base font-semibold">
            Agent activity
          </h2>
          <Link href="/activity" className="text-[13px] font-semibold">
            View full log
          </Link>
        </div>
        <ActivityFeed entries={activity} disputes={disputeInfo} now={now} />
      </section>
    </main>
  );
}
