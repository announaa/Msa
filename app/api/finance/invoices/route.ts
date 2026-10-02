import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canManageFinance } from "@/lib/rbac";
import { recomputeStudentFinance } from "@/lib/finance";

const schema = z.object({
  studentId: z.string().min(1),
  periodLabel: z.string().min(1),
  amountCents: z.number().int().positive(),
  dueDate: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canManageFinance(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invoice data." }, { status: 400 });
  }

  const invoice = await db.invoice.create({
    data: {
      studentId: parsed.data.studentId,
      periodLabel: parsed.data.periodLabel,
      amountCents: parsed.data.amountCents,
      dueDate: new Date(parsed.data.dueDate),
    },
  });

  await recomputeStudentFinance(invoice.studentId);
  await logAudit(
    session.userId,
    "finance.invoice_created",
    `Invoice ${invoice.id} (${invoice.periodLabel}) created for student ${invoice.studentId}`
  );

  return NextResponse.json(invoice, { status: 201 });
}
