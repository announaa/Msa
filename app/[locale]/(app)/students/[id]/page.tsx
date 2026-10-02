import QRCode from "qrcode";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { canAccessModule } from "@/lib/rbac";

async function canViewStudent(role: string, userId: string, studentId: string) {
  if (role === "OWNER" || role === "MANAGER") return true;
  if (role === "PARENT") {
    return !!(await db.parentGuardian.findFirst({ where: { userId, students: { some: { id: studentId } } } }));
  }
  if (role === "TEACHER") {
    return !!(await db.teacher.findFirst({
      where: { userId, subjects: { some: { students: { some: { id: studentId } } } } },
    }));
  }
  if (role === "STUDENT") {
    return !!(await db.student.findFirst({ where: { userId, id: studentId } }));
  }
  return false;
}

export default async function StudentProfilePage({
  params,
}: {
  params: { locale: Locale; id: string };
}) {
  const session = (await getSession())!;
  const dict = getDictionary(params.locale);

  const allowed = await canViewStudent(session.role, session.userId, params.id);
  if (!allowed) redirect(`/${params.locale}/dashboard`);

  const student = await db.student.findUnique({
    where: { id: params.id },
    include: {
      tasks: { orderBy: { assignedDate: "desc" }, take: 10, include: { subject: true } },
    },
  });

  if (!student) notFound();

  const qrDataUrl = await QRCode.toDataURL(student.qrToken);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between rounded-xl border bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">{student.fullName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {student.msaId} · {student.grade}
            {student.school ? ` · ${student.school}` : ""}
          </p>
          <p className="mt-1 text-sm text-slate-500">{student.dateOfBirth.toLocaleDateString(params.locale)}</p>
          <p className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
            {dict.finance.accountStatus[student.accountStatus]}
          </p>
          {canAccessModule(session.role, "finance") && (
            <p className="mt-2">
              <Link
                href={`/${params.locale}/finance/${student.id}`}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                {dict.finance.title} →
              </Link>
            </p>
          )}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="Student QR code" className="h-32 w-32" />
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold">{dict.tasks.title}</h2>
        <ul className="divide-y">
          {student.tasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {task.subject.name} — {task.description}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{dict.tasks.status[task.status]}</span>
            </li>
          ))}
          {student.tasks.length === 0 && <p className="py-2 text-sm text-slate-500">{dict.tasks.noTasks}</p>}
        </ul>
      </div>
    </div>
  );
}
