import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canManageFinance } from "@/lib/rbac";

const schema = z.object({ monthlyFeeCents: z.number().int().nonnegative() });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || !canManageFinance(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid fee." }, { status: 400 });

  const student = await db.student.update({
    where: { id: params.id },
    data: { monthlyFeeCents: parsed.data.monthlyFeeCents },
  });

  await logAudit(session.userId, "finance.fee_set", `Monthly fee for student ${student.id} set`);

  return NextResponse.json(student);
}
