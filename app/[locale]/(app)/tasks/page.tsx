import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { TaskRow } from "@/components/TaskRow";
import { AssignTaskForm } from "@/components/AssignTaskForm";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function TasksPage({ params }: { params: { locale: Locale } }) {
  const session = (await getSession())!;
  const dict = getDictionary(params.locale);
  const today = startOfToday();

  const where =
    session.role === "TEACHER"
      ? { teacher: { userId: session.userId }, assignedDate: { gte: today } }
      : session.role === "PARENT"
      ? { student: { parents: { some: { userId: session.userId } } }, assignedDate: { gte: today } }
      : session.role === "STUDENT"
      ? { student: { userId: session.userId }, assignedDate: { gte: today } }
      : { assignedDate: { gte: today } };

  const tasks = await db.task.findMany({
    where,
    include: { student: true, subject: true, teacher: { include: { user: true } } },
    orderBy: { assignedDate: "desc" },
  });

  const canAssign = session.role === "OWNER" || session.role === "MANAGER";

  let students: { id: string; fullName: string }[] = [];
  let subjects: { id: string; name: string }[] = [];
  let teachers: { id: string; fullName: string }[] = [];

  if (canAssign) {
    [students, subjects] = await Promise.all([
      db.student.findMany({ select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
      db.subject.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);
    const teacherRows = await db.teacher.findMany({ include: { user: true } });
    teachers = teacherRows.map((t) => ({ id: t.id, fullName: t.user.fullName }));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{dict.tasks.title}</h1>

      {canAssign && <AssignTaskForm students={students} subjects={subjects} teachers={teachers} dict={dict} />}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {tasks.length === 0 && <p className="p-4 text-sm text-slate-500">{dict.tasks.noTasks}</p>}
        <ul className="divide-y">
          {tasks.map((task) => {
            const canEditRow =
              session.role === "OWNER" ||
              session.role === "MANAGER" ||
              (session.role === "TEACHER" && task.teacher.userId === session.userId);
            return <TaskRow key={task.id} task={task} dict={dict} canEdit={canEditRow} />;
          })}
        </ul>
      </div>
    </div>
  );
}
