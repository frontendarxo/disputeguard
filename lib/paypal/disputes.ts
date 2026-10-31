import { paypalFetch } from "./client";

export interface Money {
  currency_code: string;
  value: string;
}

export interface DisputeSummary {
  dispute_id: string;
  create_time: string;
  update_time: string;
  reason: string;
  status: string;
  dispute_state?: string;
  dispute_amount?: Money;
  dispute_life_cycle_stage?: string;
  dispute_channel?: string;
}

export interface DisputeDetails extends DisputeSummary {
  seller_response_due_date?: string;
  buyer_response_due_date?: string;
  disputed_transactions?: Array<{
    buyer_transaction_id?: string;
    seller_transaction_id?: string;
    create_time?: string;
    transaction_status?: string;
    gross_amount?: Money;
    invoice_number?: string;
    custom?: string;
    buyer?: { name?: string };
    seller?: { merchant_id?: string; name?: string };
    items?: Array<{ item_name?: string; item_quantity?: string }>;
  }>;
  messages?: Array<{ posted_by: string; time_posted: string; content: string }>;
  evidences?: Array<{ evidence_type?: string; source?: string }>;
  /** Reason-specific details, e.g. the original transaction of a duplicate charge. */
  extensions?: Record<string, unknown>;
  offer?: unknown;
  links?: Array<{ href: string; rel: string; method: string }>;
}

interface ListDisputesResponse {
  items?: DisputeSummary[];
}

/** Lists disputes created in the last `days` days (an explicit window returns fresher results). */
export async function listDisputes(pageSize = 50, days = 30): Promise<DisputeSummary[]> {
  const start = new Date(Date.now() - days * 86_400_000).toISOString();
  const params = new URLSearchParams({ page_size: String(pageSize), start_time: start });
  const data = await paypalFetch<ListDisputesResponse>(`/v1/customer/disputes?${params.toString()}`);
  return data.items ?? [];
}

export async function getDispute(disputeId: string): Promise<DisputeDetails> {
  return paypalFetch<DisputeDetails>(
    `/v1/customer/disputes/${encodeURIComponent(disputeId)}`,
  );
}

/** Seller actions PayPal currently allows on a dispute, read from its HATEOAS links. */
export function allowedActions(d: Pick<DisputeDetails, "links">): Set<string> {
  return new Set((d.links ?? []).map((l) => l.rel));
}

/** Evidence types PayPal has asked the seller for (e.g. PROOF_OF_FULFILLMENT). */
export function requestedEvidence(d: Pick<DisputeDetails, "evidences">): string[] {
  return (d.evidences ?? [])
    .filter((e) => e.source === "REQUESTED_FROM_SELLER" && e.evidence_type)
    .map((e) => e.evidence_type!);
}
