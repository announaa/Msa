import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canManageFinance } from "@/lib/rbac";
import { recomputeStudentFinance, formatCents } from "@/lib/finance";

const schema = z.object({
  studentId: z.string().min(1),
  invoiceId: z.string().optional(),
  amountCents: z.number().int().positive(),
  method: z.enum(["CASH", "E_TRANSFER", "CARD", "OTHER"]),
  note: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canManageFinance(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment data." }, { status: 400 });
  }

  const payment = await db.payment.create({
    data: {
      studentId: parsed.data.studentId,
      invoiceId: parsed.data.invoiceId || undefined,
      amountCents: parsed.data.amountCents,
      method: parsed.data.method,
      note: parsed.data.note,
      recordedById: session.userId,
    },
  });

  const accountStatus = await recomputeStudentFinance(parsed.data.studentId);

  await logAudit(
    session.userId,
    "finance.payment_recorded",
    `Payment ${payment.id} (${formatCents(payment.amountCents)}) recorded for student ${parsed.data.studentId} — account now ${accountStatus}`
  );

  return NextResponse.json(payment, { status: 201 });
}
