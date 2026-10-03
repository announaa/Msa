import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getSubjectSummaries, getBeforeAfter } from "@/lib/analytics";
import { canRecordAssessment, canResolveAlerts } from "@/lib/rbac";
import { AssessmentForm } from "@/components/AssessmentForm";
import { AlertBanner } from "@/components/AlertBanner";

async function canViewAcademics(role: string, userId: string, studentId: string) {
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

export default async function StudentAcademicsPage({
  params,
}: {
  params: { locale: Locale; studentId: string };
}) {
  const session = (await getSession())!;
  const dict = getDictionary(params.locale);

  const allowed = await canViewAcademics(session.role, session.userId, params.studentId);
  if (!allowed) redirect(`/${params.locale}/dashboard`);

  const student = await db.student.findUnique({
    where: { id: params.studentId },
    include: { academicAlerts: { where: { status: "OPEN" } } },
  });
  if (!student) redirect(`/${params.locale}/academics`);

  const [summaries, beforeAfter] = await Promise.all([
    getSubjectSummaries(student.id),
    getBeforeAfter(student.id),
  ]);

  const canRecord = canRecordAssessment(session.role);
  let subjectOptions: { id: string; name: string }[] = [];
  if (canRecord) {
    subjectOptions =
      session.role === "TEACHER"
        ? await db.subject
            .findMany({ where: { teachers: { some: { userId: session.userId } } }, select: { id: true, name: true } })
        : await db.subject.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {dict.academics.title} — {student.fullName}
      </h1>

      {student.academicAlerts.map((alert) => (
        <AlertBanner
          key={alert.id}
          alertId={alert.id}
          message={alert.message}
          canResolve={canResolveAlerts(session.role)}
          resolveLabel={dict.academics.resolve}
        />
      ))}

      {canRecord && subjectOptions.length > 0 && (
        <AssessmentForm studentId={student.id} subjects={subjectOptions} dict={dict} />
      )}

      {beforeAfter && (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold">{dict.academics.beforeAfterTitle}</p>
          <div className="flex gap-6 text-sm">
            <span>
              {dict.academics.before}: <strong>{beforeAfter.before}%</strong>
            </span>
            <span>
              {dict.academics.after}: <strong>{beforeAfter.after}%</strong>
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {summaries.map((s) => (
          <div key={s.subjectId} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{s.subjectName}</p>
              <p className="text-sm">
                <span className="font-semibold">{s.average}%</span>{" "}
                {s.trend !== 0 && (
                  <span className={s.trend > 0 ? "text-green-600" : "text-red-600"}>
                    {s.trend > 0 ? "↑" : "↓"} {Math.abs(s.trend)}
                  </span>
                )}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="mb-1 font-medium text-green-700">{dict.academics.strongestTopics}</p>
                {s.topics.slice(0, 2).map((t) => (
                  <p key={t.topic} className="text-slate-600">
                    {t.topic} ({t.average}%)
                  </p>
                ))}
              </div>
              <div>
                <p className="mb-1 font-medium text-amber-700">{dict.academics.needsSupport}</p>
                {[...s.topics]
                  .reverse()
                  .slice(0, 2)
                  .map((t) => (
                    <p key={t.topic} className="text-slate-600">
                      {t.topic} ({t.average}%)
                    </p>
                  ))}
              </div>
            </div>
          </div>
        ))}
        {summaries.length === 0 && <p className="text-sm text-slate-500">{dict.academics.noAssessments}</p>}
      </div>
    </div>
  );
}
