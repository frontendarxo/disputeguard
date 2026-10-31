import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { deriveStatus, type DisputeStatus } from "./ui/status";

type Dispute = typeof schema.disputes.$inferSelect;
type Investigation = typeof schema.investigations.$inferSelect;
type Decision = typeof schema.decisions.$inferSelect;

export interface DisputeRow {
  id: string;
  buyer: string;
  reason: string;
  amount: number;
  currency: string;
  items: string | null;
  openedAt: string | null;
  dueAt: string | null;
  recommendation: string | null;
  confidence: number | null;
  status: DisputeStatus;
}

function latestBy<T extends { disputeId: string }>(items: T[]) {
  const map = new Map<string, T>();
  for (const item of items) if (!map.has(item.disputeId)) map.set(item.disputeId, item);
  return map;
}

function toRow(d: Dispute, inv?: Investigation, dec?: Decision): DisputeRow {
  return {
    id: d.id,
    buyer: d.buyerName ?? "Unknown buyer",
    reason: d.reason,
    amount: Number(d.amount),
    currency: d.currency,
    items: d.items,
    openedAt: d.paypalCreatedAt?.toISOString() ?? null,
    dueAt: d.responseDueAt?.toISOString() ?? null,
    recommendation: inv?.assessment?.recommendation ?? null,
    confidence: inv?.assessment?.confidence ?? null,
    status: deriveStatus(inv, dec, d.status),
  };
}

export async function getDashboardData() {
  const db = getDb();
  const [disputes, investigations, decisions, activity] = await Promise.all([
    db.select().from(schema.disputes).orderBy(desc(schema.disputes.paypalCreatedAt)),
    db.select().from(schema.investigations).orderBy(desc(schema.investigations.startedAt)),
    db.select().from(schema.decisions).orderBy(desc(schema.decisions.createdAt)),
    db.select().from(schema.activityLog).orderBy(desc(schema.activityLog.createdAt)).limit(60),
  ]);

  const latestInv = latestBy(investigations);
  const latestDec = latestBy(decisions);
  const rows = disputes.map((d) => toRow(d, latestInv.get(d.id), latestDec.get(d.id)));

  const open = disputes.filter((d) => d.status !== "RESOLVED");
  const currency = disputes[0]?.currency ?? "USD";
  const latestDecisions = [...latestDec.values()];
  const won = latestDecisions.filter((d) => d.status === "executed" && d.action === "fight");

  const kpis = {
    currency,
    atRisk: open.reduce((sum, d) => sum + Number(d.amount), 0),
    openCount: open.length,
    protected: won.reduce((sum, dec) => sum + Number(disputes.find((d) => d.id === dec.disputeId)?.amount ?? 0), 0),
    protectedCount: won.length,
    autoCount: latestDecisions.filter((d) => d.mode === "auto").length,
    decidedCount: latestDecisions.length,
    awaitingCount: latestDecisions.filter((d) => d.status === "pending_approval").length,
  };

  const approvals = latestDecisions
    .filter((d) => d.status === "pending_approval")
    .map((dec) => {
      const dispute = disputes.find((d) => d.id === dec.disputeId)!;
      const inv = investigations.find((i) => i.id === dec.investigationId);
      return { decision: dec, dispute, assessment: inv?.assessment ?? null };
    })
    .slice(0, 3);

  const disputeInfo = Object.fromEntries(
    disputes.map((d) => [d.id, { buyer: d.buyerName ?? "Buyer", amount: d.amount, currency: d.currency, reason: d.reason }]),
  );

  return { rows, kpis, approvals, activity, disputeInfo };
}

export async function getDisputeRows() {
  return (await getDashboardData()).rows;
}

export async function getDisputeDetail(id: string) {
  const db = getDb();
  const [dispute] = await db.select().from(schema.disputes).where(eq(schema.disputes.id, id)).limit(1);
  if (!dispute) return null;

  const [investigation] = await db
    .select()
    .from(schema.investigations)
    .where(eq(schema.investigations.disputeId, id))
    .orderBy(desc(schema.investigations.startedAt))
    .limit(1);

  const [decision] = investigation
    ? await db
        .select()
        .from(schema.decisions)
        .where(eq(schema.decisions.investigationId, investigation.id))
        .orderBy(desc(schema.decisions.createdAt))
        .limit(1)
    : [];

  return {
    dispute,
    investigation: investigation ?? null,
    decision: decision ?? null,
    status: deriveStatus(investigation, decision, dispute.status),
  };
}

export async function getActivity(limit = 300) {
  const db = getDb();
  const [entries, disputes] = await Promise.all([
    db.select().from(schema.activityLog).orderBy(desc(schema.activityLog.createdAt)).limit(limit),
    db.select().from(schema.disputes),
  ]);
  const disputeInfo = Object.fromEntries(
    disputes.map((d) => [d.id, { buyer: d.buyerName ?? "Buyer", amount: d.amount, currency: d.currency, reason: d.reason }]),
  );
  return { entries, disputeInfo };
}
