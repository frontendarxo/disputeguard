import { paypalFetch } from "./client";

const base = (disputeId: string) => `/v1/customer/disputes/${encodeURIComponent(disputeId)}`;

/** Accepts the buyer's claim: PayPal refunds the buyer and closes the dispute in their favour. */
export async function acceptClaim(disputeId: string, note: string) {
  return paypalFetch<unknown>(`${base(disputeId)}/accept-claim`, {
    method: "POST",
    body: JSON.stringify({ note: note.slice(0, 2000), accept_claim_type: "REFUND" }),
  });
}

export interface TrackingInfo {
  carrier_name: string;
  tracking_number: string;
}

/**
 * Submits the seller's evidence. With tracking it is sent as proof of fulfillment,
 * otherwise as a written statement. The API expects multipart/form-data with a JSON "input" part.
 */
export async function provideEvidence(disputeId: string, notes: string, tracking: TrackingInfo[] = []) {
  const evidence = tracking.length
    ? { evidence_type: "PROOF_OF_FULFILLMENT", evidence_info: { tracking_info: tracking }, notes: notes.slice(0, 2000) }
    : { evidence_type: "OTHER", notes: notes.slice(0, 2000) };

  const form = new FormData();
  form.append("input", new Blob([JSON.stringify({ evidences: [evidence] })], { type: "application/json" }));
  return paypalFetch<unknown>(`${base(disputeId)}/provide-evidence`, { method: "POST", body: form });
}

/** Sends a message to the buyer about the dispute (used during the inquiry stage). */
export async function sendMessage(disputeId: string, message: string) {
  return paypalFetch<unknown>(`${base(disputeId)}/send-message`, {
    method: "POST",
    body: JSON.stringify({ message: message.slice(0, 2000) }),
  });
}
