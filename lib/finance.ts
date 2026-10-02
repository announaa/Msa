import { db } from "@/lib/db";

// Open item from the Phase 0 blueprint, now decided: 7 days past an
// invoice's due date before the account flips from Payment Due to
// Overdue. Change this one constant if the business wants a different
// grace window — nothing else needs to change.
export const GRACE_PERIOD_DAYS = 7;

export function formatCents(cents: number, locale: string = "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

// Recomputes every invoice's status for a student from its payments,
// then rolls that up into the student's AccountStatus. Call this after
// any payment is recorded or any invoice is created/edited — never set
// Invoice.status or Student.accountStatus by hand anywhere else.
export async function recomputeStudentFinance(studentId: string) {
  const invoices = await db.invoice.findMany({
    where: { studentId },
    include: { payments: true },
  });

  for (const invoice of invoices) {
    const paidCents = invoice.payments.reduce((sum, p) => sum + p.amountCents, 0);
    const status = paidCents <= 0 ? "UNPAID" : paidCents < invoice.amountCents ? "PARTIAL" : "PAID";
    if (status !== invoice.status) {
      await db.invoice.update({ where: { id: invoice.id }, data: { status } });
    }
  }

  const outstanding = invoices.filter((inv) => {
    const paidCents = inv.payments.reduce((sum, p) => sum + p.amountCents, 0);
    return paidCents < inv.amountCents;
  });

  let accountStatus: "ACTIVE" | "PAYMENT_DUE" | "OVERDUE" = "ACTIVE";
  if (outstanding.length > 0) {
    const earliestDue = outstanding.reduce(
      (min, inv) => (inv.dueDate < min ? inv.dueDate : min),
      outstanding[0].dueDate
    );
    const graceDeadline = new Date(earliestDue);
    graceDeadline.setDate(graceDeadline.getDate() + GRACE_PERIOD_DAYS);
    accountStatus = new Date() > graceDeadline ? "OVERDUE" : "PAYMENT_DUE";
  }

  await db.student.update({ where: { id: studentId }, data: { accountStatus } });
  return accountStatus;
}
