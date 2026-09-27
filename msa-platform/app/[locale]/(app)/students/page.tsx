import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDictionary, type Locale } from "@/lib/dictionaries";

export default async function StudentsPage({ params }: { params: { locale: Locale } }) {
  const session = (await getSession())!;
  const dict = getDictionary(params.locale);

  if (session.role === "STUDENT") {
    const own = await db.student.findUnique({ where: { userId: session.userId } });
    if (own) redirect(`/${params.locale}/students/${own.id}`);
  }

  const where =
    session.role === "PARENT"
      ? { parents: { some: { userId: session.userId } } }
      : session.role === "TEACHER"
      ? { subjects: { some: { teachers: { some: { userId: session.userId } } } } }
      : {};

  const students = await db.student.findMany({ where, orderBy: { fullName: "asc" } });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{dict.nav.students}</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {students.map((s) => (
          <Link
            key={s.id}
            href={`/${params.locale}/students/${s.id}`}
            className="rounded-xl border bg-white p-4 shadow-sm hover:border-brand-500"
          >
            <p className="font-semibold">{s.fullName}</p>
            <p className="text-sm text-slate-500">
              {s.msaId} · {s.grade}
            </p>
          </Link>
        ))}
        {students.length === 0 && <p className="text-sm text-slate-500">—</p>}
      </div>
    </div>
  );
}
