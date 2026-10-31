import Link from "next/link";
import { ActivityList } from "@/components/activity-list";
import { DecisionButtons } from "@/components/decision-buttons";
import { DisputesGrid } from "@/components/disputes-grid";
import { KpiCard } from "@/components/kpi-card";
import { ImportDispute } from "@/components/import-dispute";
import { SyncButton } from "@/components/sync-button";
import { getDashboardData } from "@/lib/queries";
import { money, reasonLabel } from "@/lib/ui/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { rows, kpis, approvals, activity } = await getDashboardData();
  const now = Date.now();
  const autoPct = kpis.decidedCount ? Math.round((kpis.autoCount / kpis.decidedCount) * 100) : 0;

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">Disputes overview</h1>
          <p className="mt-1.5 text-muted">Your PayPal disputes, investigated by the agent and decided by your rules.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImportDispute />
          <SyncButton />
          <Link
            href="/rules"
            className="flex min-h-10 items-center rounded-lg bg-accent px-4 font-semibold text-white no-underline hover:bg-accent-ink"
          >
            Edit agent rules
          </Link>
        </div>
      </div>

      <section aria-label="Key metrics" className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <KpiCard label="Money at risk" value={money(kpis.atRisk, kpis.currency)} hint={`${kpis.openCount} open disputes`} />
        <KpiCard
          label="Protected by the agent"
          value={money(kpis.protected, kpis.currency)}
          hint={`${kpis.protectedCount} claims answered with evidence`}
          tone="ok"
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
          tone="warn"
          hint={kpis.awaitingCount ? <a href="#approvals" className="font-semibold">Review now</a> : "All caught up"}
        />
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <div className="min-w-0 flex-[999_1_640px]">
          <DisputesGrid rows={rows} />
        </div>

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-6">
          <section id="approvals" aria-labelledby="approve-title" className="flex flex-col gap-3.5 rounded-xl border border-line bg-white p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 id="approve-title" className="text-base font-semibold">
                Needs your approval
              </h2>
              <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">{kpis.awaitingCount}</span>
            </div>
            {approvals.length === 0 ? (
              <p className="text-muted">Nothing waiting for you.</p>
            ) : (
              approvals.map(({ decision, dispute, assessment }) => (
                <div key={decision.id} className="flex flex-col gap-2.5 rounded-[10px] border border-line p-3.5">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold">
                      {dispute.buyerName ?? "Buyer"} · {money(dispute.amount, dispute.currency)}
                    </span>
                    <span className="text-[13px] text-muted">{reasonLabel(dispute.reason)}</span>
                  </div>
                  <p className="text-body">
                    Agent suggests <strong>{decision.action === "fight" ? "fighting" : decision.action === "refund" ? "a refund" : "your review"}</strong>
                    {assessment ? ` (${Math.round(assessment.confidence * 100)}% confident)` : ""}. {decision.reason.replace("Needs your approval: ", "Needs you because ")}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <DecisionButtons decisionId={decision.id} action={decision.action} compact />
                    <Link
                      href={`/disputes/${encodeURIComponent(dispute.id)}`}
                      className="flex min-h-10 items-center px-2 font-semibold"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))
            )}
          </section>

          <section aria-labelledby="activity-title" className="flex flex-col gap-3.5 rounded-xl border border-line bg-white p-5">
            <h2 id="activity-title" className="text-base font-semibold">
              Agent activity
            </h2>
            <ActivityList entries={activity} now={now} />
            <Link href="/activity" className="text-[13px] font-semibold">
              View full activity log
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
