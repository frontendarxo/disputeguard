import type { DeliveryStatus } from "./types";

export interface Tracker {
  status?: string;
  tracking_number?: string;
}

/**
 * The agent reads tracking and proposes a delivery status, but rules like
 * "fight when delivered" must not rest on the model's word alone. This checks the
 * claim against PayPal's tracker records and downgrades anything they don't support.
 */
export function verifyDeliveryStatus(claimed: DeliveryStatus, trackers: Tracker[]): DeliveryStatus {
  const hasTracking = trackers.some((t) => t.tracking_number);
  const delivered = trackers.some((t) => t.status?.toUpperCase() === "DELIVERED");
  switch (claimed) {
    case "delivered":
      return delivered ? "delivered" : hasTracking ? "in_transit" : "not_found";
    case "in_transit":
    case "shipped_no_tracking_updates":
      return hasTracking ? claimed : "not_found";
    default:
      return claimed;
  }
}
