import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDictionary, type Locale } from "@/lib/dictionaries";

export default async function AcademicsPage({ params }: { params: { locale: Locale } }) {
  const session = (await getSession())!;
  const dict = getDictionary(params.locale);

  if (session.role === "STUDENT") {
    const own = await db.student.findUnique({ where: { userId: session.userId } });
    if (own) redirect(`/${params.locale}/academics/${own.id}`);
  }

  const where =
    session.role === "PARENT"
      ? { parents: { some: { userId: session.userId } } }
      : session.role === "TEACHER"
      ? { subjects: { some: { teachers: { some: { userId: session.userId } } } } }
      : {};

  const students = await db.student.findMany({
    where,
    include: { academicAlerts: { where: { status: "OPEN" } } },
    orderBy: { fullName: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{dict.academics.title}</h1>
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <ul className="divide-y">
          {students.map((s) => (
            <li key={s.id}>
              <Link
                href={`/${params.locale}/academics/${s.id}`}
                className="flex items-center justify-between gap-3 p-4 text-sm hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium">{s.fullName}</p>
                  <p className="text-slate-500">{s.msaId}</p>
                </div>
                {s.academicAlerts.length > 0 && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                    {s.academicAlerts.length} ⚠
                  </span>
                )}
              </Link>
            </li>
          ))}
          {students.length === 0 && <li className="p-4 text-sm text-slate-500">—</li>}
        </ul>
      </div>
    </div>
  );
}
