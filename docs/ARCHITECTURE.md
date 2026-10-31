# DisputeGuard — Architecture & Roadmap

DisputeGuard is an AI agent that investigates and resolves PayPal disputes for small online sellers,
acting autonomously only within rules the seller defines.

## Overview

```
┌──────────────────────── Next.js (App Router, TypeScript) ────────────────────────┐
│  UI (React)                         Server (Route Handlers / Server Actions)     │
│  ├─ Dashboard + AG Grid  ◄────────► ├─ /api/disputes        list + sync          │
│  ├─ Dispute detail                  ├─ /api/agent/run       run agent (stream)   │
│  │   (live agent reasoning)         ├─ /api/actions         approve / reject     │
│  ├─ Rules (plain English)           ├─ /api/rules           seller rules         │
│  └─ Activity log                    └─ /api/webhooks/paypal new dispute → agent  │
│                                              │                                   │
│                    ┌─────────────────────────┼────────────────────────┐          │
│                    ▼                         ▼                        ▼          │
│              AI agent                  Policy engine               Database      │
│        (Vercel AI SDK + Claude)    (plain code, no LLM:        (disputes, rules, │
│                    │                decides if the agent        decisions, log)  │
│                    ▼                may act on its own)                          │
│       PayPal Agent Toolkit + PayPal REST APIs (Sandbox)                          │
│       disputes · transactions · orders · shipment tracking · invoices            │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Core principle: the AI investigates, code decides

1. **The agent (LLM) investigates.** It calls PayPal tools itself (read dispute, find transaction,
   check tracking) and returns a **structured** result: recommendation, confidence, evidence,
   draft response, explanation.
2. **The policy engine decides whether to act automatically.** A plain TypeScript function checks
   the agent's result against the seller's rules (amount limits, delivery confirmed, confidence
   threshold). The agent cannot bypass these limits.
3. **Rules are written in plain English.** An LLM converts them into strict JSON (Zod schema);
   the seller sees how each rule was understood and confirms it.

## Dispute lifecycle

```
New dispute ──► Investigate ──► Assess ──► Policy engine ─┬─► Auto: fight / refund ──► Log
(webhook or                     (AI)                      └─► Needs approval ──► Seller ✓/✗ ──► Action
 Sync button)
```

UI statuses: `New → Investigating → Awaiting approval → Done (fought / refunded)`.
A dispute is marked "Done" only after PayPal confirms the action.

## PayPal tools

| Task | Tool |
|---|---|
| List / read disputes | Agent Toolkit: `list_disputes`, `get_dispute` |
| Accept claim / refund | Agent Toolkit: `accept_dispute_claim` |
| Submit evidence and response | Disputes REST API (provide-evidence) |
| Find the original payment | Transaction Search API |
| Check delivery | Agent Toolkit: `get_shipment_tracking` |
| Demo data: orders and tracking | Orders API + Shipment Tracking API (seed script) |
| Real-time new disputes | Webhook `CUSTOMER.DISPUTE.CREATED` + manual Sync fallback |

The Disputes API also offers sandbox-only simulation endpoints to move a dispute through its
lifecycle, which lets the demo show the full cycle up to a final decision.

## Stack

- Next.js 15, TypeScript, Tailwind CSS
- AG Grid Community — disputes table (sponsor tool)
- Vercel AI SDK + Claude — agent with tool calling and streamed steps
- `@paypal/agent-toolkit` — PayPal tools for the agent
- Zod — schemas for agent output and rules
- Prisma: SQLite locally, Postgres on Render in production
- Render — hosting and public webhook URL (sponsor tool)

## Screens

1. **Dashboard** — KPIs (money at risk, money saved, auto-resolved, awaiting approval) and an
   AG Grid table: amount, reason, stage, deadline, agent recommendation, confidence, status.
2. **Dispute detail** — live feed of agent steps, collected evidence, draft response,
   Approve / Reject.
3. **Rules** — write a rule → preview how the agent understood it → save.
4. **Activity log** — every agent and seller action, linked to PayPal API calls.

## Roadmap

| Date | Task | Outcome |
|---|---|---|
| Oct 31 | Sandbox setup, architecture, project scaffold, PayPal connection | Script lists sandbox disputes |
| Nov 1 | PayPal client: disputes, transactions, tracking; test sandbox simulation | All dispute data available in code |
| Nov 2 | AI agent: tools, investigation, structured output | Agent produces a recommendation |
| Nov 3 | Policy engine + plain-English rules | Auto-action or approval request per rules |
| Nov 4 | Actions: fight (evidence), accept, activity log | Agent performs real sandbox actions |
| Nov 5 | UI: dashboard, AG Grid, KPIs | Main screen |
| Nov 6 | UI: dispute detail with live streaming, rules screen | Full user flow |
| Nov 7 | Deploy to Render, webhook, demo data (5–7 disputes) | Live demo URL |
| Nov 8 | Polish, error handling, README with setup steps | Ready to present |
| Nov 9 | Demo video script and recording (< 3 min) | Video on YouTube |
| Nov 10 | Devpost description, screenshots, **submit** | Submission sent |
| Nov 11–12 | Buffer | Deadline Nov 12, 12:00 PT |

## Demo video outline

0:00–0:20 problem · 0:20–0:40 seller rules in plain English · 0:40–1:50 new dispute, live
investigation, agent auto-fights a small claim · 1:50–2:30 large claim awaits one-click approval ·
2:30–3:00 dashboard "money saved" and architecture. Voice-over only, no music.
