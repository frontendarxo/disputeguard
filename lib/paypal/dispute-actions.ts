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
export async function provideEvidence(
  disputeId: string,
  notes: string,
  tracking: TrackingInfo[] = [],
  evidenceType: "PROOF_OF_FULFILLMENT" | "OTHER" = tracking.length ? "PROOF_OF_FULFILLMENT" : "OTHER",
) {
  const evidence =
    evidenceType === "PROOF_OF_FULFILLMENT" && tracking.length
      ? { evidence_type: evidenceType, evidence_info: { tracking_info: tracking }, notes: notes.slice(0, 2000) }
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

/**
 * SANDBOX ONLY: simulates PayPal asking the seller for evidence, moving a dispute
 * from UNDER_REVIEW to WAITING_FOR_SELLER_RESPONSE. Used to prepare demo data.
 */
export async function simulateEvidenceRequest(disputeId: string) {
  return paypalFetch<unknown>(`${base(disputeId)}/require-evidence`, {
    method: "POST",
    body: JSON.stringify({ action: "SELLER_EVIDENCE" }),
  });
}
