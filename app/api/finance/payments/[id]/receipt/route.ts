import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatCents } from "@/lib/finance";
import { generateReceiptPdf } from "@/lib/receipt";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  E_TRANSFER: "e-Transfer",
  CARD: "Card",
  OTHER: "Other",
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payment = await db.payment.findUnique({
    where: { id: params.id },
    include: { student: true, invoice: true },
  });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed =
    session.role === "OWNER" ||
    session.role === "MANAGER" ||
    (session.role === "PARENT" &&
      !!(await db.parentGuardian.findFirst({
        where: { userId: session.userId, students: { some: { id: payment.studentId } } },
      })));

  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const pdfBytes = await generateReceiptPdf({
    receiptNumber: payment.id.slice(-8).toUpperCase(),
    studentName: payment.student.fullName,
    msaId: payment.student.msaId,
    amountLabel: formatCents(payment.amountCents),
    method: METHOD_LABELS[payment.method] ?? payment.method,
    paidAt: payment.paidAt,
    note: payment.note,
    invoiceLabel: payment.invoice?.periodLabel ?? null,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="MSA-receipt-${payment.id.slice(-8)}.pdf"`,
    },
  });
}
