import { boolean, index, jsonb, numeric, pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import type { Assessment } from "../agent/schema";
import type { AgentStepEvent } from "../agent/investigate";
import type { PolicyCheck } from "../policy/engine";
import type { RuleConditions } from "../policy/types";

/** Disputes mirrored from PayPal. PayPal stays the source of truth. */
export const disputes = pgTable("disputes", {
  id: text("id").primaryKey(), // PayPal dispute_id
  reason: text("reason").notNull(),
  status: text("status").notNull(),
  stage: text("stage"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  buyerName: text("buyer_name"),
  sellerTransactionId: text("seller_transaction_id"),
  items: text("items"),
  paypalCreatedAt: timestamp("paypal_created_at", { withTimezone: true }),
  responseDueAt: timestamp("response_due_at", { withTimezone: true }),
  raw: jsonb("raw"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export const investigations = pgTable(
  "investigations",
  {
    id: serial("id").primaryKey(),
    disputeId: text("dispute_id").notNull().references(() => disputes.id, { onDelete: "cascade" }),
    status: text("status").$type<"running" | "completed" | "failed">().notNull(),
    model: text("model"),
    assessment: jsonb("assessment").$type<Assessment>(),
    steps: jsonb("steps").$type<AgentStepEvent[]>().notNull().default([]),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("investigations_dispute_idx").on(t.disputeId)],
);

export const decisions = pgTable(
  "decisions",
  {
    id: serial("id").primaryKey(),
    disputeId: text("dispute_id").notNull().references(() => disputes.id, { onDelete: "cascade" }),
    investigationId: integer("investigation_id").notNull().references(() => investigations.id, { onDelete: "cascade" }),
    mode: text("mode").$type<"auto" | "approval">().notNull(),
    action: text("action").$type<"fight" | "refund">(),
    reason: text("reason").notNull(),
    checks: jsonb("checks").$type<PolicyCheck[]>().notNull(),
    matchedRuleId: text("matched_rule_id"),
    status: text("status")
      .$type<"pending_approval" | "approved" | "rejected" | "executing" | "executed" | "failed">()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    /** The text actually sent to PayPal (the agent's draft, possibly edited by the seller). */
    responseText: text("response_text"),
    /** What was sent and what PayPal answered. */
    execution: jsonb("execution").$type<{
      method: "accept_claim" | "provide_evidence" | "send_message";
      ok: boolean;
      detail: string;
      paypal?: unknown;
      at: string;
    }>(),
    executedAt: timestamp("executed_at", { withTimezone: true }),
  },
  (t) => [index("decisions_dispute_idx").on(t.disputeId)],
);

export const rules = pgTable("rules", {
  id: text("id").primaryKey(),
  text: text("text").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  conditions: jsonb("conditions").$type<RuleConditions>().notNull(),
  action: text("action").$type<"auto_fight" | "auto_refund" | "ask">().notNull(),
  explanation: text("explanation").notNull(),
  unsupported: text("unsupported"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityLog = pgTable(
  "activity_log",
  {
    id: serial("id").primaryKey(),
    disputeId: text("dispute_id").references(() => disputes.id, { onDelete: "set null" }),
    actor: text("actor").$type<"agent" | "seller" | "system">().notNull(),
    type: text("type").notNull(),
    message: text("message").notNull(),
    data: jsonb("data"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_created_idx").on(t.createdAt)],
);
