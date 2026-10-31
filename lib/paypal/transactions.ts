import { paypalFetch } from "./client";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Looks up a transaction with the Transaction Search API.
 * The API requires a date window of at most 31 days, so we search the 30 days
 * before `around` (usually the dispute creation time) plus one day after.
 * Note: in the sandbox, new transactions can take up to a few hours to be indexed.
 */
export async function findTransaction(transactionId: string, around: string | Date = new Date()) {
  const anchor = new Date(around).getTime();
  const start = new Date(anchor - 30 * DAY_MS).toISOString();
  const end = new Date(Math.min(anchor + DAY_MS, Date.now())).toISOString();

  const params = new URLSearchParams({
    transaction_id: transactionId,
    start_date: start,
    end_date: end,
    fields: "all",
  });

  const data = await paypalFetch<{ transaction_details?: unknown[] }>(
    `/v1/reporting/transactions?${params.toString()}`,
  );
  return data.transaction_details?.[0] ?? null;
}
