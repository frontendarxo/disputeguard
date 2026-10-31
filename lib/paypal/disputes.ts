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
  offer?: unknown;
  links?: Array<{ href: string; rel: string; method: string }>;
}

interface ListDisputesResponse {
  items?: DisputeSummary[];
}

export async function listDisputes(pageSize = 50): Promise<DisputeSummary[]> {
  const data = await paypalFetch<ListDisputesResponse>(
    `/v1/customer/disputes?page_size=${pageSize}`,
  );
  return data.items ?? [];
}

export async function getDispute(disputeId: string): Promise<DisputeDetails> {
  return paypalFetch<DisputeDetails>(
    `/v1/customer/disputes/${encodeURIComponent(disputeId)}`,
  );
}
