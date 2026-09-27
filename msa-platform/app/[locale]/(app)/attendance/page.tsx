import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDictionary, type Locale } from "@/lib/dictionaries";

function formatDuration(checkIn: Date, checkOut: Date | null) {
  if (!checkOut) return "—";
  const ms = checkOut.getTime() - checkIn.getTime();
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export default async function AttendancePage({ params }: { params: { locale: Locale } }) {
  const session = (await getSession())!;
  const dict = getDictionary(params.locale);
  const isStaff = session.role === "OWNER" || session.role === "MANAGER";

  const studentScope =
    session.role === "PARENT"
      ? { parents: { some: { userId: session.userId } } }
      : session.role === "STUDENT"
      ? { userId: session.userId }
      : session.role === "TEACHER"
      ? { subjects: { some: { teachers: { some: { userId: session.userId } } } } }
      : {};

  const studentRecords = await db.attendanceRecord.findMany({
    where: { student: studentScope },
    include: { student: true },
    orderBy: { checkInAt: "desc" },
    take: 30,
  });

  const teacherRecords = isStaff
    ? await db.attendanceRecord.findMany({
        where: { teacherId: { not: null } },
        include: { teacher: { include: { user: true } } },
        orderBy: { checkInAt: "desc" },
        take: 30,
      })
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{dict.nav.attendance}</h1>

      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <h2 className="border-b p-4 font-semibold">{dict.nav.students}</h2>
        <ul className="divide-y">
          {studentRecords.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
              <span>{r.student?.fullName}</span>
              <span className="text-slate-500">
                {r.checkInAt.toLocaleString(params.locale)}
                {r.checkOutAt
                  ? ` → ${r.checkOutAt.toLocaleTimeString(params.locale)}`
                  : ` · ${dict.attendance.checkedIn}`}
              </span>
              <span className="font-medium">{formatDuration(r.checkInAt, r.checkOutAt)}</span>
            </li>
          ))}
          {studentRecords.length === 0 && <li className="p-4 text-sm text-slate-500">—</li>}
        </ul>
      </section>

      {isStaff && (
        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <h2 className="border-b p-4 font-semibold">Staff</h2>
          <ul className="divide-y">
            {teacherRecords.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <span>{r.teacher?.user.fullName}</span>
                <span className="text-slate-500">
                  {r.checkInAt.toLocaleString(params.locale)}
                  {r.checkOutAt
                    ? ` → ${r.checkOutAt.toLocaleTimeString(params.locale)}`
                    : ` · ${dict.attendance.checkedIn}`}
                </span>
                <span className="font-medium">{formatDuration(r.checkInAt, r.checkOutAt)}</span>
              </li>
            ))}
            {teacherRecords.length === 0 && <li className="p-4 text-sm text-slate-500">—</li>}
          </ul>
        </section>
      )}
    </div>
  );
}
