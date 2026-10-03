import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canResolveAlerts } from "@/lib/rbac";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || !canResolveAlerts(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const alert = await db.academicAlert.update({
    where: { id: params.id },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });

  await logAudit(session.userId, "academics.alert_resolved", `Academic alert ${alert.id} resolved`);

  return NextResponse.json(alert);
}
