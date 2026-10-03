import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canRecordAssessment } from "@/lib/rbac";
import { canViewStudentData } from "@/lib/access";
import { MONTH_RE } from "@/lib/monthly-report";

const schema = z.object({
  studentId: z.string().min(1),
  month: z.string().regex(MONTH_RE),
  strengths: z.string().max(2000),
  areasToImprove: z.string().max(2000),
  recommendations: z.string().max(2000),
});

// Create or update the teacher-written part of a monthly report.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canRecordAssessment(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid report note." }, { status: 400 });

  // Teachers only for students they teach (Owner/Manager: anyone).
  if (!(await canViewStudentData(session.role, session.userId, parsed.data.studentId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { studentId, month, ...fields } = parsed.data;
  const note = await db.monthlyReportNote.upsert({
    where: { studentId_month: { studentId, month } },
    create: { studentId, month, ...fields, authoredById: session.userId },
    update: { ...fields, authoredById: session.userId },
  });

  await logAudit(session.userId, "academics.report_note_saved", `Report note for student ${studentId}, ${month}`);

  return NextResponse.json(note);
}
