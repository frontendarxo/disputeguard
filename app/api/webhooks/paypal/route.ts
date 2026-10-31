import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { describeError } from "@/lib/errors";
import { verifyWebhook } from "@/lib/paypal/webhooks";
import { logActivity } from "@/lib/services/activity";
import { startInvestigation } from "@/lib/services/process-dispute";
import { autoInvestigateEnabled, syncDispute } from "@/lib/services/sync";

export const dynamic = "force-dynamic";

interface DisputeWebhook {
  id: string;
  event_type: string;
  resource?: { dispute_id?: string; status?: string };
}

/**
 * PayPal pushes dispute events here the moment they happen:
 *  - CUSTOMER.DISPUTE.CREATED → import the dispute and start the agent
 *  - CUSTOMER.DISPUTE.UPDATED / RESOLVED → refresh the dispute
 */
export async function POST(request: Request) {
  const event = (await request.json().catch(() => null)) as DisputeWebhook | null;
  if (!event?.event_type) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    if (!(await verifyWebhook(request.headers, event))) {
      return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
    }
  } catch (err) {
    console.error("[webhook] verification error", err);
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }

  const disputeId = event.resource?.dispute_id;
  if (!disputeId || !event.event_type.startsWith("CUSTOMER.DISPUTE.")) {
    return NextResponse.json({ ignored: true });
  }

  try {
    if (event.event_type === "CUSTOMER.DISPUTE.CREATED") {
      // PayPal may deliver the same event more than once: only act the first time.
      const [known] = await getDb().select({ id: schema.disputes.id }).from(schema.disputes).where(eq(schema.disputes.id, disputeId)).limit(1);
      if (known) {
        await syncDispute(disputeId);
        return NextResponse.json({ ok: true, duplicate: true });
      }
      const row = await syncDispute(disputeId);
      await logActivity({
        disputeId,
        actor: "system",
        type: "dispute.received",
        message: `New dispute from ${row.buyerName ?? "a buyer"}: ${row.amount} ${row.currency} (via PayPal webhook)`,
      });
      if (autoInvestigateEnabled()) await startInvestigation(disputeId);
    } else {
      await syncDispute(disputeId);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook] handling error", err);
    // 500 makes PayPal retry the delivery later.
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
