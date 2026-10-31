import { getDb, schema } from "../db";

export async function logActivity(entry: {
  disputeId?: string | null;
  actor: "agent" | "seller" | "system";
  type: string;
  message: string;
  data?: unknown;
}) {
  await getDb()
    .insert(schema.activityLog)
    .values({
      disputeId: entry.disputeId ?? null,
      actor: entry.actor,
      type: entry.type,
      message: entry.message,
      data: entry.data ?? null,
    });
}
