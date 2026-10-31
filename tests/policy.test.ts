/**
 * Policy engine tests. Rules are defined here and limits come from DEFAULT_GUARDRAILS,
 * so the tests check the logic — not whatever rules or limits you configure in the app.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluatePolicy, type PolicyInput } from "../lib/policy/engine";
import { DEFAULT_GUARDRAILS, type Guardrails, type Rule } from "../lib/policy/types";

const g: Guardrails = DEFAULT_GUARDRAILS;
const NOT_RECEIVED = "MERCHANDISE_OR_SERVICE_NOT_RECEIVED";
const allowedStage = g.autoStages.fight[0];
const confident = Math.min(1, Math.max(g.minConfidence.fight, g.minConfidence.refund) + 0.1);
const smallAmount = g.maxAutoAmount / 2;

function rule(partial: Partial<Rule> & Pick<Rule, "action">): Rule {
  return { id: partial.action, text: partial.action, enabled: true, conditions: {}, explanation: "", ...partial };
}

const fightDelivered = rule({
  id: "fight",
  action: "auto_fight",
  conditions: { reasons: [NOT_RECEIVED], deliveryStatus: ["delivered"], maxAmount: g.maxAutoAmount },
});
const refundLost = rule({
  id: "refund",
  action: "auto_refund",
  conditions: { reasons: [NOT_RECEIVED], deliveryStatus: ["lost", "not_found"] },
});

function input(overrides: Partial<PolicyInput> = {}): PolicyInput {
  return {
    reason: NOT_RECEIVED,
    amount: smallAmount,
    currency: "USD",
    stage: allowedStage,
    recommendation: "fight",
    confidence: confident,
    deliveryStatus: "delivered",
    ...overrides,
  };
}

describe("policy engine", () => {
  it("acts automatically when every check passes and a rule allows it", () => {
    const d = evaluatePolicy(input(), [fightDelivered], g);
    assert.equal(d.mode, "auto");
    assert.equal(d.action, "fight");
    assert.equal(d.matchedRule?.id, "fight");
    assert.ok(d.checks.every((c) => c.passed));
  });

  it("asks when no rule allows the action", () => {
    const d = evaluatePolicy(input(), [], g);
    assert.equal(d.mode, "approval");
  });

  it("asks when the amount is over the auto-limit, even if a rule matches", () => {
    const loose = rule({ action: "auto_fight", conditions: {} });
    const d = evaluatePolicy(input({ amount: g.maxAutoAmount + 1 }), [loose], g);
    assert.equal(d.mode, "approval");
    assert.match(d.reason, /auto-limit/);
  });

  it("asks when the agent is below the confidence threshold for the action", () => {
    const fight = evaluatePolicy(input({ confidence: g.minConfidence.fight - 0.01 }), [fightDelivered], g);
    assert.equal(fight.mode, "approval");
    assert.match(fight.reason, /confident/);

    const refund = evaluatePolicy(
      input({ recommendation: "refund", deliveryStatus: "lost", confidence: g.minConfidence.refund - 0.01 }),
      [refundLost],
      g,
    );
    assert.equal(refund.mode, "approval");
  });

  it("uses each action's own confidence threshold", () => {
    const between = (g.minConfidence.fight + g.minConfidence.refund) / 2;
    const lower = Math.min(g.minConfidence.fight, g.minConfidence.refund);
    const higher = Math.max(g.minConfidence.fight, g.minConfidence.refund);
    if (lower === higher) return; // same threshold for both: nothing to compare
    const refund = evaluatePolicy(input({ recommendation: "refund", deliveryStatus: "lost", confidence: between }), [refundLost], g);
    const fight = evaluatePolicy(input({ confidence: between }), [fightDelivered], g);
    assert.equal(refund.mode, g.minConfidence.refund <= between ? "auto" : "approval");
    assert.equal(fight.mode, g.minConfidence.fight <= between ? "auto" : "approval");
  });

  it("never fights automatically outside the allowed stages (e.g. chargebacks)", () => {
    const stage = "CHARGEBACK";
    assert.ok(!g.autoStages.fight.includes(stage));
    const d = evaluatePolicy(input({ stage }), [fightDelivered], g);
    assert.equal(d.mode, "approval");
    assert.match(d.reason, /chargeback/);
  });

  it("may refund automatically in any stage listed for refunds", () => {
    for (const stage of g.autoStages.refund) {
      const d = evaluatePolicy(input({ stage, recommendation: "refund", deliveryStatus: "lost" }), [refundLost], g);
      assert.equal(d.mode, "auto", `refund in ${stage}`);
    }
  });

  it("never acts in a stage listed for neither action", () => {
    const d = evaluatePolicy(input({ stage: "ARBITRATION", recommendation: "refund", deliveryStatus: "lost" }), [refundLost], g);
    assert.equal(d.mode, "approval");
  });

  it("asks when the agent leaves the call to the seller", () => {
    const d = evaluatePolicy(input({ recommendation: "needs_human" }), [fightDelivered, refundLost], g);
    assert.equal(d.mode, "approval");
    assert.equal(d.action, null);
  });

  it("does not use a rule for a different action than the agent recommends", () => {
    const d = evaluatePolicy(input({ recommendation: "fight", deliveryStatus: "not_found" }), [refundLost], g);
    assert.equal(d.mode, "approval");
  });

  it("lets an 'ask' rule override an auto rule", () => {
    const ask = rule({ id: "ask", action: "ask", conditions: { minAmount: 0 } });
    const d = evaluatePolicy(input(), [fightDelivered, ask], g);
    assert.equal(d.mode, "approval");
    assert.equal(d.matchedRule?.id, "ask");
  });

  it("ignores disabled rules", () => {
    const d = evaluatePolicy(input(), [{ ...fightDelivered, enabled: false }], g);
    assert.equal(d.mode, "approval");
  });

  it("respects rule conditions on reason, delivery and amount", () => {
    assert.equal(evaluatePolicy(input({ reason: "UNAUTHORISED" }), [fightDelivered], g).mode, "approval");
    assert.equal(evaluatePolicy(input({ deliveryStatus: "in_transit" }), [fightDelivered], g).mode, "approval");
    const capped = rule({ action: "auto_fight", conditions: { maxAmount: smallAmount - 1 } });
    assert.equal(evaluatePolicy(input(), [capped], g).mode, "approval");
  });

  it("follows changed guardrails", () => {
    const strict: Guardrails = { ...g, maxAutoAmount: smallAmount - 1 };
    assert.equal(evaluatePolicy(input(), [fightDelivered], strict).mode, "approval");
  });
});
