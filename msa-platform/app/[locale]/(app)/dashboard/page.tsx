import { getSession } from "@/lib/auth";
import { getDictionary, format, type Locale } from "@/lib/dictionaries";
import { db } from "@/lib/db";

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
    const [totalStudents, presentToday, tasksToday, completedToday, pendingRegistrations] = await Promise.all([
      db.student.count(),
      db.attendanceRecord.count({ where: { studentId: { not: null }, checkOutAt: null } }),
      db.task.count({ where: { assignedDate: { gte: today } } }),
      db.task.count({ where: { assignedDate: { gte: today }, status: "COMPLETED" } }),
      db.registrationRequest.count({ where: { status: "PENDING" } }),
    ]);

    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">{dict.dashboard.ownerToday}</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label={dict.dashboard.totalStudents} value={totalStudents} />
          <StatCard label={dict.dashboard.presentToday} value={presentToday} />
          <StatCard label={dict.dashboard.tasksAssignedVsCompleted} value={`${completedToday}/${tasksToday}`} />
          <StatCard label={dict.dashboard.pendingRegistrations} value={pendingRegistrations} />
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
          },
        },
      },
    });

    const students = parent?.students ?? [];

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{format(dict.dashboard.greetingParent, { name: session.fullName })}</h1>
        {students.map((student) => {
          const openRecord = student.attendanceRecords[0];
          const atCenter = !!openRecord && !openRecord.checkOutAt;
          const completed = student.tasks.filter((t) => t.status === "COMPLETED").length;
          const latestNote = student.tasks.find((t) => t.note)?.note;

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
              </div>
              {latestNote && (
                <p className="mt-3 text-sm text-slate-600">
                  <span className="font-medium">{dict.dashboard.latestNote}:</span> {latestNote}
                </p>
              )}
            </div>
          );
        })}
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
