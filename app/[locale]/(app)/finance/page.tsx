import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { formatCents } from "@/lib/finance";

function statusColor(status: string) {
  if (status === "ACTIVE") return "bg-green-100 text-green-700";
  if (status === "PAYMENT_DUE") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

export default async function FinancePage({ params }: { params: { locale: Locale } }) {
  const session = (await getSession())!;
  const dict = getDictionary(params.locale);

  const where =
    session.role === "PARENT" ? { parents: { some: { userId: session.userId } } } : {};

  const students = await db.student.findMany({
    where,
    include: { invoices: { include: { payments: true } } },
    orderBy: { fullName: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{dict.finance.title}</h1>
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <ul className="divide-y">
          {students.map((s) => {
            const outstandingCents = s.invoices.reduce((sum, inv) => {
              const paid = inv.payments.reduce((p, x) => p + x.amountCents, 0);
              return sum + Math.max(0, inv.amountCents - paid);
            }, 0);
            return (
              <li key={s.id}>
                <Link
                  href={`/${params.locale}/finance/${s.id}`}
                  className="flex items-center justify-between gap-3 p-4 text-sm hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium">{s.fullName}</p>
                    <p className="text-slate-500">{s.msaId}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {outstandingCents > 0 && (
                      <span className="text-slate-600">
                        {dict.finance.outstandingBalance}: {formatCents(outstandingCents, params.locale)}
                      </span>
                    )}
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor(s.accountStatus)}`}>
                      {dict.finance.accountStatus[s.accountStatus]}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
          {students.length === 0 && <li className="p-4 text-sm text-slate-500">—</li>}
        </ul>
      </div>
    </div>
  );
}
