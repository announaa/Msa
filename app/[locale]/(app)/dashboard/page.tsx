import { getSession } from "@/lib/auth";
import { getDictionary, format, type Locale } from "@/lib/dictionaries";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/finance";
import { getSubjectSummaries } from "@/lib/analytics";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default async function DashboardPage({ params }: { params: { locale: Locale } }) {
  const session = (await getSession())!;
  const dict = getDictionary(params.locale);
  const today = startOfToday();

  if (session.role === "OWNER" || session.role === "MANAGER") {
    const [
      totalStudents,
      presentToday,
      tasksToday,
      completedToday,
      pendingRegistrations,
      overdueAccounts,
      unpaidInvoices,
      openAcademicAlerts,
    ] = await Promise.all([
      db.student.count(),
      db.attendanceRecord.count({ where: { studentId: { not: null }, checkOutAt: null } }),
      db.task.count({ where: { assignedDate: { gte: today } } }),
      db.task.count({ where: { assignedDate: { gte: today }, status: "COMPLETED" } }),
      db.registrationRequest.count({ where: { status: "PENDING" } }),
      db.student.count({ where: { accountStatus: "OVERDUE" } }),
      db.invoice.findMany({ where: { status: { not: "PAID" } }, include: { payments: true } }),
      db.academicAlert.count({ where: { status: "OPEN" } }),
    ]);

    const outstandingCents = unpaidInvoices.reduce((sum, inv) => {
      const paid = inv.payments.reduce((p, x) => p + x.amountCents, 0);
      return sum + Math.max(0, inv.amountCents - paid);
    }, 0);

    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">{dict.dashboard.ownerToday}</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label={dict.dashboard.totalStudents} value={totalStudents} />
          <StatCard label={dict.dashboard.presentToday} value={presentToday} />
          <StatCard label={dict.dashboard.tasksAssignedVsCompleted} value={`${completedToday}/${tasksToday}`} />
          <StatCard label={dict.dashboard.pendingRegistrations} value={pendingRegistrations} />
          <StatCard label={dict.dashboard.outstandingTotal} value={formatCents(outstandingCents, params.locale)} />
          <StatCard label={dict.dashboard.overdueAccounts} value={overdueAccounts} />
          <StatCard label={dict.dashboard.declineAlerts} value={openAcademicAlerts} />
        </div>
      </div>
    );
  }

  if (session.role === "PARENT") {
    const parent = await db.parentGuardian.findUnique({
      where: { userId: session.userId },
      include: {
        students: {
          include: {
            tasks: { where: { assignedDate: { gte: today } }, orderBy: { updatedAt: "desc" } },
            attendanceRecords: { orderBy: { checkInAt: "desc" }, take: 1 },
            invoices: { where: { status: { not: "PAID" } }, include: { payments: true } },
          },
        },
      },
    });

    const students = parent?.students ?? [];

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{format(dict.dashboard.greetingParent, { name: session.fullName })}</h1>
        {await Promise.all(
          students.map(async (student) => {
          const openRecord = student.attendanceRecords[0];
          const atCenter = !!openRecord && !openRecord.checkOutAt;
          const completed = student.tasks.filter((t) => t.status === "COMPLETED").length;
          const latestNote = student.tasks.find((t) => t.note)?.note;
          const outstandingCents = student.invoices.reduce((sum, inv) => {
            const paid = inv.payments.reduce((p, x) => p + x.amountCents, 0);
            return sum + Math.max(0, inv.amountCents - paid);
          }, 0);
          const subjectSummaries = await getSubjectSummaries(student.id);
          const academicAverage =
            subjectSummaries.length > 0
              ? Math.round(subjectSummaries.reduce((sum, s) => sum + s.average, 0) / subjectSummaries.length)
              : null;

          return (
            <div key={student.id} className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{student.fullName}</h2>
                <span className={`text-sm font-medium ${atCenter ? "text-green-600" : "text-slate-400"}`}>
                  {atCenter ? dict.dashboard.childAtCenter : dict.dashboard.childNotAtCenter}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <StatCard label={dict.dashboard.todaysTasks} value={`${completed}/${student.tasks.length}`} />
                {academicAverage != null && (
                  <StatCard label={dict.dashboard.academicAverage} value={`${academicAverage}%`} />
                )}
              </div>
              {latestNote && (
                <p className="mt-3 text-sm text-slate-600">
                  <span className="font-medium">{dict.dashboard.latestNote}:</span> {latestNote}
                </p>
              )}
              {outstandingCents > 0 && (
                <p className="mt-3 text-sm">
                  <span className="font-medium text-amber-700">
                    {dict.finance.outstandingBalance}: {formatCents(outstandingCents, params.locale)}
                  </span>{" "}
                  ·{" "}
                  <a href={`/${params.locale}/finance/${student.id}`} className="text-brand-600 hover:underline">
                    {dict.finance.title}
                  </a>
                </p>
              )}
            </div>
          );
          })
        )}
        {students.length === 0 && <p className="text-sm text-slate-500">—</p>}
      </div>
    );
  }

  // TEACHER / STUDENT — a simplified "today" summary for Phase 1.
  const tasks = await db.task.findMany({
    where:
      session.role === "TEACHER"
        ? { teacher: { userId: session.userId }, assignedDate: { gte: today } }
        : { student: { userId: session.userId }, assignedDate: { gte: today } },
  });
  const completed = tasks.filter((t) => t.status === "COMPLETED").length;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{format(dict.dashboard.greetingStaff, { name: session.fullName })}</h1>
      <StatCard label={dict.dashboard.todaysTasks} value={`${completed}/${tasks.length}`} />
    </div>
  );
}
