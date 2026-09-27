import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDictionary, format, type Locale } from "@/lib/dictionaries";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

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

type Event = { time: Date; label: string };

export default async function JourneyPage({
  params,
}: {
  params: { locale: Locale; studentId: string };
}) {
  const session = (await getSession())!;
  const dict = getDictionary(params.locale);
  const today = startOfToday();

  const allowed = await canViewStudent(session.role, session.userId, params.studentId);
  if (!allowed) redirect(`/${params.locale}/dashboard`);

  const [student, attendance, statusEvents, tasksToday] = await Promise.all([
    db.student.findUnique({ where: { id: params.studentId } }),
    db.attendanceRecord.findMany({ where: { studentId: params.studentId, checkInAt: { gte: today } } }),
    db.taskStatusEvent.findMany({
      where: { task: { studentId: params.studentId, assignedDate: { gte: today } }, createdAt: { gte: today } },
      include: { task: { include: { subject: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.task.findMany({ where: { studentId: params.studentId, assignedDate: { gte: today } } }),
  ]);

  if (!student) redirect(`/${params.locale}/dashboard`);

  const events: Event[] = [];
  attendance.forEach((r) => {
    events.push({ time: r.checkInAt, label: dict.journey.checkedIn });
    if (r.checkOutAt) events.push({ time: r.checkOutAt, label: dict.journey.checkedOut });
  });
  statusEvents.forEach((e) => {
    events.push({ time: e.createdAt, label: `${e.task.subject.name} — ${dict.tasks.status[e.status]}` });
  });
  events.sort((a, b) => a.time.getTime() - b.time.getTime());

  const completed = tasksToday.filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">
          {dict.journey.title} — {student.fullName}
        </h1>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
          {format(dict.journey.tasksCompletedToday, { completed, total: tasksToday.length })}
        </span>
      </div>

      <ol className="space-y-3 border-s-2 border-brand-100 ps-4">
        {events.map((e, i) => (
          <li key={i} className="text-sm">
            <span className="font-medium text-slate-500">{e.time.toLocaleTimeString(params.locale)}</span>{" "}
            <span>— {e.label}</span>
          </li>
        ))}
        {events.length === 0 && <li className="text-sm text-slate-500">—</li>}
      </ol>
    </div>
  );
}
