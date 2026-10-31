import Link from "next/link";
import { notFound } from "next/navigation";
import { InvestigateButton } from "@/components/investigate-button";
import { LiveRefresh } from "@/components/live-refresh";
import { ResponsePanel } from "@/components/response-panel";
import { SendButton } from "@/components/send-button";
import { StatusChip } from "@/components/status-chip";
import { getDisputeDetail } from "@/lib/queries";
import { money, reasonLabel, shortDate, titleCase } from "@/lib/ui/format";
import { toTimeline } from "@/lib/ui/steps";

export const dynamic = "force-dynamic";

const EVIDENCE_LABELS: Record<string, string> = {
  proof_of_delivery: "Proof of delivery",
  proof_of_shipment: "Proof of shipment",
  transaction_record: "Transaction record",
  invoice: "Invoice",
  customer_communication: "Customer communication",
  other: "Other",
};

function Check({ ok }: { ok: boolean }) {
  return ok ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5L20 7" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M12 7v6M12 17h.01" />
    </svg>
  );
}

export default async function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getDisputeDetail(decodeURIComponent(id));
  if (!detail) notFound();

  const { dispute, investigation, decision, status } = detail;
  const running = investigation?.status === "running";
  // Once you approve or reject, the case is settled — no new investigation.
  const canReinvestigate = !decision || decision.status === "pending_approval" || decision.status === "failed";
  const timeline = toTimeline(investigation?.steps ?? []);
  const a = investigation?.assessment ?? null;
  const buyerMessage = (dispute.raw as { messages?: Array<{ posted_by: string; content: string }> } | null)?.messages?.find(
    (m) => m.posted_by === "BUYER",
  );
  const paypalActions = new Set(
    ((dispute.raw as { links?: Array<{ rel: string }> } | null)?.links ?? []).map((l) => l.rel),
  );
  const sellerCanRespond = ["accept_claim", "provide_evidence", "send_message"].some((r) => paypalActions.has(r));
  const recTone = a?.recommendation === "fight" ? "text-accent-ink" : a?.recommendation === "refund" ? "text-ink" : "text-warn";
  const recText = a?.recommendation === "fight" ? "Fight this claim" : a?.recommendation === "refund" ? "Refund the buyer" : "Needs your judgement";

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 pb-10 pt-6 sm:px-8">
      <LiveRefresh active={running || decision?.status === "executing"} />

      <Link href="/" className="inline-flex items-center gap-1.5 self-start font-medium text-muted no-underline hover:text-ink">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        All disputes
      </Link>

      <section aria-label="Dispute summary" className="flex flex-wrap items-center justify-between gap-6 rounded-xl border border-line bg-white p-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">{reasonLabel(dispute.reason)}</h1>
            <StatusChip status={status} />
          </div>
          <span className="text-muted">
            {dispute.buyerName ?? "Buyer"}
            {dispute.items ? ` · ${dispute.items}` : ""} · <span className="font-mono text-[13px]">{dispute.id}</span>
          </span>
        </div>
        <dl className="grid grid-cols-[repeat(2,minmax(110px,auto))] gap-x-8 gap-y-3 sm:grid-cols-[repeat(4,minmax(110px,auto))]">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium text-muted">Opened</dt>
            <dd className="text-xl font-bold">{shortDate(dispute.paypalCreatedAt)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium text-muted">Amount</dt>
            <dd className="text-xl font-bold">{money(dispute.amount, dispute.currency)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium text-muted">Stage</dt>
            <dd className="text-xl font-bold">{titleCase(dispute.stage)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium text-muted">Respond by</dt>
            <dd className="text-xl font-bold">{shortDate(dispute.responseDueAt)}</dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-wrap items-start gap-5">
        <section aria-labelledby="inv-title" className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
          <div className="flex flex-col gap-4 rounded-xl border border-line bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 id="inv-title" className="text-base font-semibold">
                Agent investigation
              </h2>
              {running ? (
                <span className="flex items-center gap-2 text-[13px] text-muted">
                  <span className="size-2 animate-pulse rounded-full bg-accent" aria-hidden="true" />
                  Live
                </span>
              ) : investigation && canReinvestigate ? (
                <InvestigateButton disputeId={dispute.id} label="Investigate again" variant="secondary" />
              ) : null}
            </div>

            {!investigation ? (
              <div className="flex flex-col items-start gap-3 rounded-[10px] bg-subtle p-5">
                <p className="text-body">The agent hasn't looked at this dispute yet.</p>
                <InvestigateButton disputeId={dispute.id} />
              </div>
            ) : (
              <ol className="flex flex-col">
                {timeline.map((item) => (
                  <li key={item.key} className="flex gap-3.5">
                    <span className="flex flex-col items-center">
                      <span
                        className={`flex size-6 flex-shrink-0 items-center justify-center rounded-full ${item.ok ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}
                      >
                        <Check ok={item.ok} />
                      </span>
                      <span className="min-h-4 w-0.5 flex-grow bg-line" />
                    </span>
                    <span className="flex flex-col gap-1 pb-4">
                      <span className="font-semibold">{item.title}</span>
                      {item.detail && <span className="text-body">{item.detail}</span>}
                      <span className="font-mono text-xs text-muted">{item.tool}</span>
                    </span>
                  </li>
                ))}
                {running && (
                  <li className="flex gap-3.5">
                    <span className="flex size-6 items-center justify-center rounded-full bg-accent-soft">
                      <span className="size-2 animate-pulse rounded-full bg-accent" aria-hidden="true" />
                    </span>
                    <span className="text-muted">Agent is working…</span>
                  </li>
                )}
                {investigation.status === "failed" && (
                  <li className="rounded-lg bg-red-50 p-3 text-danger">Investigation failed: {investigation.error}</li>
                )}
                {a && (
                  <li className="flex gap-3.5">
                    <span className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                      <Check ok />
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="font-semibold">Assessment ready</span>
                      <span className="text-body">Checked against your rules{investigation.model ? ` · ${investigation.model}` : ""}.</span>
                    </span>
                  </li>
                )}
              </ol>
            )}
          </div>

          {a && a.keyFacts.length > 0 && (
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-6">
              <h2 className="text-base font-semibold">What the agent found</h2>
              <ul className="flex flex-col gap-2">
                {a.keyFacts.map((f, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-2">
                    <span className="text-body">{f.fact}</span>
                    <span className="font-mono text-xs text-muted">{f.source}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {buyerMessage && (
            <div className="flex flex-col gap-3.5 rounded-xl border border-line bg-white p-6">
              <h2 className="text-base font-semibold">Buyer&apos;s message</h2>
              <blockquote className="rounded-[10px] bg-subtle px-4 py-3.5 text-body">“{buyerMessage.content}”</blockquote>
            </div>
          )}
        </section>

        <aside className="flex min-w-0 flex-[1_1_380px] flex-col gap-5">
          {a ? (
            <>
              <section aria-labelledby="rec-title" className="flex flex-col gap-4 rounded-xl border border-line bg-white p-6">
                <h2 id="rec-title" className="text-[13px] font-semibold uppercase tracking-wide text-muted">
                  Recommendation
                </h2>
                <div className="flex items-baseline justify-between gap-3">
                  <span className={`text-[22px] font-bold ${recTone}`}>{recText}</span>
                  <span className="font-semibold tabular-nums">{Math.round(a.confidence * 100)}% confident</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                  <div className="h-1.5 bg-accent" style={{ width: `${Math.round(a.confidence * 100)}%` }} />
                </div>
                <p className="text-body">{a.summary}</p>

                {decision && (
                  <div className="flex flex-col gap-2 rounded-[10px] bg-subtle p-4">
                    <span className="font-semibold">Your rules say</span>
                    <ul className="flex flex-col gap-1.5">
                      {decision.checks.map((c, i) => (
                        <li key={i} className={`flex gap-2 ${c.passed ? "text-body" : "font-medium text-warn"}`}>
                          <span className={`mt-0.5 ${c.passed ? "text-ok" : "text-warn"}`}>
                            <Check ok={c.passed} />
                          </span>
                          {c.label}
                        </li>
                      ))}
                    </ul>
                    <span className={`mt-1 font-semibold ${decision.mode === "auto" ? "text-ok" : "text-warn"}`}>{decision.reason}</span>
                  </div>
                )}
              </section>

              {a.evidence.length > 0 && (
                <section aria-labelledby="ev-title" className="flex flex-col gap-3 rounded-xl border border-line bg-white p-6">
                  <h2 id="ev-title" className="text-base font-semibold">
                    Evidence
                  </h2>
                  <ul className="flex flex-col gap-2">
                    {a.evidence.map((e, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
                        <span className="flex flex-col gap-0.5">
                          <span className="font-semibold">{EVIDENCE_LABELS[e.type] ?? e.type}</span>
                          <span className="text-xs text-muted">{e.description}</span>
                        </span>
                        <span className={`whitespace-nowrap text-xs font-semibold ${e.available ? "text-ok" : "text-warn"}`}>
                          {e.available ? "Available" : "Missing"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section aria-labelledby="draft-title" className="flex flex-col gap-3 rounded-xl border border-line bg-white p-6">
                {!sellerCanRespond && decision && decision.status !== "executed" && (
                  <p className="rounded-[10px] bg-warn-soft p-3.5 text-warn">
                    PayPal is {dispute.status === "UNDER_REVIEW" ? "reviewing this dispute" : `holding this dispute (${titleCase(dispute.status)})`} and
                    isn&apos;t accepting a seller response right now. You can still record your decision; sending will work once PayPal asks for
                    your response. Sync to refresh.
                  </p>
                )}
                {decision?.status === "pending_approval" ? (
                  <ResponsePanel
                    label={a.recommendation === "refund" ? "Note to the buyer" : "Response to PayPal"}
                    draft={a.draftResponse}
                    decisionId={decision.id}
                    action={decision.action}
                  />
                ) : (
                  <>
                    <h2 id="draft-title" className="text-base font-semibold">
                      {decision?.execution ? "Sent to PayPal" : a.recommendation === "refund" ? "Note to the buyer" : "Response to PayPal"}
                    </h2>
                    <p className="whitespace-pre-line rounded-lg bg-subtle p-3 leading-normal text-body">
                      {decision?.responseText ?? a.draftResponse}
                    </p>
                    {decision?.execution && (
                      <div
                        className={`flex flex-col gap-1 rounded-[10px] p-3.5 ${decision.execution.ok ? "bg-ok-soft text-ok" : "bg-red-50 text-danger"}`}
                      >
                        <span className="font-semibold">
                          {decision.execution.ok ? "✓ PayPal accepted the action" : "PayPal action failed"}
                          <span className="ml-2 font-mono text-xs font-medium">{decision.execution.method}</span>
                        </span>
                        <span>{decision.execution.detail}</span>
                      </div>
                    )}
                    {decision && !decision.execution && (
                      <p className="font-semibold text-muted">
                        {decision.status === "rejected" && "You rejected this recommendation."}
                        {decision.status === "executing" && "Sending to PayPal…"}
                      </p>
                    )}
                    {decision && (decision.status === "approved" || decision.status === "failed") && decision.action && (
                      <SendButton decisionId={decision.id} label={decision.status === "failed" ? "Try again" : "Send to PayPal"} />
                    )}
                  </>
                )}
              </section>
            </>
          ) : (
            <section className="rounded-xl border border-line bg-white p-6 text-muted">
              {running ? "The recommendation will appear here when the agent finishes." : "Run an investigation to get a recommendation."}
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
