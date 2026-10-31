import { PayPalApiError, paypalFetch } from "./client";

/** Returns shipment tracking records attached to a PayPal transaction (empty if none). */
export async function getTrackingForTransaction(transactionId: string): Promise<unknown> {
  try {
    return await paypalFetch<unknown>(
      `/v1/shipping/trackers?transaction_id=${encodeURIComponent(transactionId)}`,
    );
  } catch (err) {
    if (err instanceof PayPalApiError && err.status === 404) {
      return { trackers: [], note: "No tracking information found for this transaction." };
    }
    throw err;
  }
}
