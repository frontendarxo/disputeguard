import { inArray } from "drizzle-orm";
import { getDb, schema } from "../db";
import { getDispute, listDisputes, type DisputeDetails } from "../paypal/disputes";
import { logActivity } from "./activity";

function toRow(d: DisputeDetails) {
  const tx = d.disputed_transactions?.[0];
  return {
    id: d.dispute_id,
    reason: d.reason,
    status: d.status,
    stage: d.dispute_life_cycle_stage ?? null,
    amount: d.dispute_amount?.value ?? "0",
    currency: d.dispute_amount?.currency_code ?? "USD",
    buyerName: tx?.buyer?.name ?? null,
    sellerTransactionId: tx?.seller_transaction_id ?? null,
    items: tx?.items?.map((i) => `${i.item_name ?? "Item"} × ${i.item_quantity ?? 1}`).join(", ") || null,
    paypalCreatedAt: d.create_time ? new Date(d.create_time) : null,
    responseDueAt: d.seller_response_due_date ? new Date(d.seller_response_due_date) : null,
    raw: d,
    syncedAt: new Date(),
  };
}

/** Saves one dispute from PayPal into the database (insert or update). */
export async function syncDispute(disputeId: string) {
  const details = await getDispute(disputeId);
  const row = toRow(details);
  await getDb()
    .insert(schema.disputes)
    .values(row)
    .onConflictDoUpdate({ target: schema.disputes.id, set: row });
  return row;
}

/** Pulls all recent disputes from PayPal. Returns which ones are new. */
export async function syncDisputes() {
  const summaries = await listDisputes(50);
  const ids = summaries.map((s) => s.dispute_id);

  const existing = ids.length
    ? await getDb().select({ id: schema.disputes.id }).from(schema.disputes).where(inArray(schema.disputes.id, ids))
    : [];
  const known = new Set(existing.map((e) => e.id));

  // Also refresh disputes we already store that the (sometimes lagging) list didn't return.
  const stored = await getDb().select({ id: schema.disputes.id }).from(schema.disputes);
  for (const { id } of stored) {
    if (!ids.includes(id)) await syncDispute(id).catch(() => undefined);
  }

  const created: string[] = [];
  for (const id of ids) {
    const row = await syncDispute(id);
    if (!known.has(id)) {
      created.push(id);
      await logActivity({
        disputeId: id,
        actor: "system",
        type: "dispute.received",
        message: `New dispute from ${row.buyerName ?? "a buyer"}: ${row.amount} ${row.currency}`,
      });
    }
  }
  return { total: ids.length, created };
}

/** New disputes are investigated automatically unless AUTO_INVESTIGATE=false. */
export function autoInvestigateEnabled() {
  return process.env.AUTO_INVESTIGATE?.trim().toLowerCase() !== "false";
}
