import { db } from "@/lib/db";

// Section 5 of the brief is explicit: every sensitive action must be
// recorded and viewable by the Owner. Call this from route handlers
// right after the write it's describing succeeds.
export async function logAudit(actorId: string | null, action: string, details?: string) {
  await db.auditLog.create({
    data: { actorId: actorId ?? undefined, action, details },
  });
}
