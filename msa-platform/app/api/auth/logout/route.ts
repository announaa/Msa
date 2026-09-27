import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const session = await getSession();
  clearSessionCookie();
  if (session) {
    await logAudit(session.userId, "auth.logout", `${session.fullName} logged out`);
  }
  return NextResponse.json({ ok: true });
}
