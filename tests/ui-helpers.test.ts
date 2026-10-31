import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { daysUntil, money, reasonLabel } from "../lib/ui/format";
import { conditionChips } from "../lib/ui/rules";
import { deriveStatus } from "../lib/ui/status";
import { toTimeline } from "../lib/ui/steps";

describe("format helpers", () => {
  it("formats money and reasons", () => {
    assert.equal(money(25, "USD"), "$25.00");
    assert.equal(money("1234.5", "USD"), "$1,234.50");
    assert.equal(reasonLabel("MERCHANDISE_OR_SERVICE_NOT_RECEIVED"), "Item not received");
  });

  it("counts days until a deadline", () => {
    const now = Date.UTC(2026, 0, 1);
    assert.equal(daysUntil(new Date(now + 3 * 86_400_000).toISOString(), now), 3);
    assert.equal(daysUntil(null, now), null);
  });
});

describe("rule chips", () => {
  it("describes conditions in plain words", () => {
    const chips = conditionChips({
      conditions: { reasons: ["MERCHANDISE_OR_SERVICE_NOT_RECEIVED"], deliveryStatus: ["delivered"], maxAmount: 50 },
    });
    assert.deepEqual(chips, ["reason: item not received", "delivery: delivered", "amount ≤ $50"]);
    assert.deepEqual(conditionChips({ conditions: {} }), ["any dispute"]);
  });
});

describe("dispute status", () => {
  it("combines investigation and decision into one status", () => {
    assert.equal(deriveStatus(null, null).label, "New");
    assert.equal(deriveStatus({ status: "running" }, null).label, "Investigating");
    assert.equal(deriveStatus({ status: "completed" }, { mode: "approval", status: "pending_approval" }).label, "Awaiting approval");
    assert.equal(deriveStatus({ status: "completed" }, { mode: "auto", status: "executed", action: "refund" }).label, "Refunded");
    assert.equal(deriveStatus({ status: "completed" }, null, "RESOLVED").label, "Resolved");
  });
});

describe("agent timeline", () => {
  it("turns agent steps into readable items", () => {
    const items = toTimeline([
      {
        index: 0,
        text: "",
        toolCalls: [{ tool: "get_shipment_tracking", input: {} }],
        toolResults: [{ tool: "get_shipment_tracking", output: { data: { trackers: [] } } }],
      },
      { index: 1, text: "", toolCalls: [{ tool: "submit_assessment", input: {} }], toolResults: [] },
    ]);
    assert.equal(items.length, 1);
    assert.equal(items[0].title, "Checked shipment tracking");
    assert.equal(items[0].ok, false);
  });
});
