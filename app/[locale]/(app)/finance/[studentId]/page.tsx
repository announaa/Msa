import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { formatCents } from "@/lib/finance";
import { canManageFinance } from "@/lib/rbac";
import { FinanceManager } from "@/components/FinanceManager";

async function canViewFinance(role: string, userId: string, studentId: string) {
  if (role === "OWNER" || role === "MANAGER") return true;
  if (role === "PARENT") {
    return !!(await db.parentGuardian.findFirst({ where: { userId, students: { some: { id: studentId } } } }));
  }
  return false;
}

function invoiceStatusColor(status: string) {
  if (status === "PAID") return "bg-green-100 text-green-700";
  if (status === "PARTIAL") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

export default async function StudentFinancePage({
  params,
}: {
  params: { locale: Locale; studentId: string };
}) {
  const session = (await getSession())!;
  const dict = getDictionary(params.locale);

  const allowed = await canViewFinance(session.role, session.userId, params.studentId);
  if (!allowed) redirect(`/${params.locale}/dashboard`);

  const student = await db.student.findUnique({
    where: { id: params.studentId },
    include: {
      invoices: { orderBy: { dueDate: "desc" } },
      payments: { orderBy: { paidAt: "desc" }, include: { invoice: true } },
    },
  });
  if (!student) redirect(`/${params.locale}/finance`);

  const canManage = canManageFinance(session.role);
  const openInvoices = student.invoices
    .filter((inv) => inv.status !== "PAID")
    .map((inv) => ({ id: inv.id, periodLabel: inv.periodLabel }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">
          {dict.finance.title} — {student.fullName}
        </h1>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
          {dict.finance.accountStatus[student.accountStatus]}
        </span>
      </div>

      {canManage && (
        <FinanceManager
          studentId={student.id}
          monthlyFeeCents={student.monthlyFeeCents}
          openInvoices={openInvoices}
          dict={dict}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <h2 className="border-b p-4 font-semibold">Invoices</h2>
          <ul className="divide-y">
            {student.invoices.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <p className="font-medium">{inv.periodLabel}</p>
                  <p className="text-slate-500">{inv.dueDate.toLocaleDateString(params.locale)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span>{formatCents(inv.amountCents, params.locale)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${invoiceStatusColor(inv.status)}`}>
                    {dict.finance.invoiceStatus[inv.status]}
                  </span>
                </div>
              </li>
            ))}
            {student.invoices.length === 0 && (
              <li className="p-4 text-sm text-slate-500">{dict.finance.noInvoices}</li>
            )}
          </ul>
        </section>

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <h2 className="border-b p-4 font-semibold">Payments</h2>
          <ul className="divide-y">
            {student.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <p className="font-medium">
                    {formatCents(p.amountCents, params.locale)} · {dict.finance.method[p.method]}
                  </p>
                  <p className="text-slate-500">
                    {p.paidAt.toLocaleDateString(params.locale)}
                    {p.invoice ? ` · ${p.invoice.periodLabel}` : ""}
                  </p>
                </div>
                <a
                  href={`/api/finance/payments/${p.id}/receipt`}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {dict.finance.downloadReceipt}
                </a>
              </li>
            ))}
            {student.payments.length === 0 && (
              <li className="p-4 text-sm text-slate-500">{dict.finance.noPayments}</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
