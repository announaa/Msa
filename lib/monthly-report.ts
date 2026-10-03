import { db } from "@/lib/db";

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export type MonthlyReportData = {
  month: string;
  monthLabel: string;
  studentName: string;
  msaId: string;
  grade: string;
  attendance: { daysAttended: number; centerDays: number; percent: number | null };
  tasks: { completed: number; total: number };
  subjects: { name: string; average: number; deltaVsPrevious: number | null }[];
  teacher: { strengths: string; areasToImprove: string; recommendations: string; written: boolean };
};

function average(nums: number[]): number {
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function recentMonths(count: number, from: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

// Everything except the teacher's written assessment is computed live
// from existing data when the PDF is requested (section 4.15: "auto-
// generated"). Definitions worth knowing:
//  - Attendance % = days the student attended / "center days" (days on
//    which any student checked in). There's no class schedule model yet,
//    so this is the honest proxy for "days they could have attended".
//  - Subject delta = this month's average vs. the previous month's, shown
//    only when both months have assessments in that subject.
export async function buildMonthlyReport(studentId: string, month: string): Promise<MonthlyReportData | null> {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  const prevStart = new Date(y, m - 2, 1);

  const student = await db.student.findUnique({ where: { id: studentId } });
  if (!student) return null;

  const [studentAttendance, centerAttendance, tasks, assessments, note] = await Promise.all([
    db.attendanceRecord.findMany({ where: { studentId, checkInAt: { gte: start, lt: end } } }),
    db.attendanceRecord.findMany({
      where: { studentId: { not: null }, checkInAt: { gte: start, lt: end } },
      select: { checkInAt: true },
    }),
    db.task.findMany({ where: { studentId, assignedDate: { gte: start, lt: end } } }),
    db.assessment.findMany({
      where: { studentId, gradedAt: { gte: prevStart, lt: end } },
      include: { subject: true },
    }),
    db.monthlyReportNote.findUnique({ where: { studentId_month: { studentId, month } } }),
  ]);

  const daysAttended = new Set(studentAttendance.map((r) => dayKey(r.checkInAt))).size;
  const centerDays = new Set(centerAttendance.map((r) => dayKey(r.checkInAt))).size;

  const thisMonth = assessments.filter((a) => a.gradedAt >= start);
  const prevMonth = assessments.filter((a) => a.gradedAt < start);

  const bySubject = new Map<string, { name: string; scores: number[] }>();
  for (const a of thisMonth) {
    const entry: { name: string; scores: number[] } = bySubject.get(a.subjectId) ?? { name: a.subject.name, scores: [] };
    entry.scores.push(a.scorePercent);
    bySubject.set(a.subjectId, entry);
  }
  const subjects = Array.from(bySubject.entries())
    .map(([subjectId, { name, scores }]) => {
      const prev = prevMonth.filter((a) => a.subjectId === subjectId).map((a) => a.scorePercent);
      const current = average(scores);
      return { name, average: current, deltaVsPrevious: prev.length ? current - average(prev) : null };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  let teacher = {
    strengths: note?.strengths ?? "",
    areasToImprove: note?.areasToImprove ?? "",
    recommendations: note?.recommendations ?? "",
    written: !!note,
  };
  if (!note) {
    // No teacher note yet — derive strongest / weakest topics from this
    // month's grades so the section isn't empty, and mark it as auto.
    const byTopic = new Map<string, number[]>();
    for (const a of thisMonth) byTopic.set(a.topic, [...(byTopic.get(a.topic) ?? []), a.scorePercent]);
    const topics = Array.from(byTopic.entries())
      .map(([topic, scores]) => ({ topic, average: average(scores) }))
      .sort((a, b) => b.average - a.average);
    const label = (t: { topic: string; average: number }) => `${t.topic} (${t.average}%)`;
    teacher = {
      strengths: topics.slice(0, 2).map(label).join(", "),
      areasToImprove: topics
        .slice(-2)
        .filter((t) => t.average < 75)
        .map(label)
        .join(", "),
      recommendations: "",
      written: false,
    };
  }

  return {
    month,
    monthLabel: start.toLocaleDateString("en-CA", { month: "long", year: "numeric" }),
    studentName: student.fullName,
    msaId: student.msaId,
    grade: student.grade,
    attendance: {
      daysAttended,
      centerDays,
      percent: centerDays > 0 ? Math.round((daysAttended / centerDays) * 100) : null,
    },
    tasks: { completed: tasks.filter((t) => t.status === "COMPLETED").length, total: tasks.length },
    subjects,
    teacher,
  };
}
