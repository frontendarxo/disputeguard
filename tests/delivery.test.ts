import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { verifyDeliveryStatus } from "../lib/policy/delivery";

describe("verifyDeliveryStatus (code checks the agent's delivery claim)", () => {
  it("keeps 'delivered' only when a tracker says DELIVERED", () => {
    assert.equal(verifyDeliveryStatus("delivered", [{ tracking_number: "1Z", status: "DELIVERED" }]), "delivered");
  });
  it("downgrades 'delivered' to in transit when tracking exists but isn't delivered", () => {
    assert.equal(verifyDeliveryStatus("delivered", [{ tracking_number: "1Z", status: "SHIPPED" }]), "in_transit");
  });
  it("downgrades shipping claims to not_found without any tracking", () => {
    assert.equal(verifyDeliveryStatus("delivered", []), "not_found");
    assert.equal(verifyDeliveryStatus("in_transit", []), "not_found");
  });
  it("leaves statuses that don't claim a shipment alone", () => {
    assert.equal(verifyDeliveryStatus("not_applicable", []), "not_applicable");
    assert.equal(verifyDeliveryStatus("lost", [{ tracking_number: "1Z" }]), "lost");
  });
});
