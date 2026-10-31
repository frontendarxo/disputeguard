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

export type TrackerStatus = "SHIPPED" | "DELIVERED" | "ON_HOLD" | "CANCELLED";

/** Attaches a tracking number to a PayPal transaction (used to prepare demo data). */
export async function addTracking(transactionId: string, trackingNumber: string, status: TrackerStatus, carrier = "UPS") {
  const result = await paypalFetch<{ tracker_identifiers?: unknown[]; errors?: Array<{ message?: string }> }>(
    "/v1/shipping/trackers-batch",
    {
      method: "POST",
      body: JSON.stringify({ trackers: [{ transaction_id: transactionId, tracking_number: trackingNumber, status, carrier }] }),
    },
  );
  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message ?? "Unknown tracking error").join("; "));
  }
  return result;
}
