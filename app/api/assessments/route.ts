import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canRecordAssessment } from "@/lib/rbac";
import { checkAcademicDecline } from "@/lib/analytics";

const schema = z.object({
  studentId: z.string().min(1),
  subjectId: z.string().min(1),
  topic: z.string().min(1),
  examLabel: z.string().min(1),
  scorePercent: z.number().int().min(0).max(100),
  gradedAt: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canRecordAssessment(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid assessment data." }, { status: 400 });
  }

  if (session.role === "TEACHER") {
    const owns = await db.teacher.findFirst({
      where: {
        userId: session.userId,
        subjects: { some: { id: parsed.data.subjectId, students: { some: { id: parsed.data.studentId } } } },
      },
    });
    if (!owns) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assessment = await db.assessment.create({
    data: {
      studentId: parsed.data.studentId,
      subjectId: parsed.data.subjectId,
      topic: parsed.data.topic,
      examLabel: parsed.data.examLabel,
      scorePercent: parsed.data.scorePercent,
      gradedAt: parsed.data.gradedAt ? new Date(parsed.data.gradedAt) : undefined,
      recordedById: session.userId,
    },
  });

  const alert = await checkAcademicDecline(parsed.data.studentId, parsed.data.subjectId);

  await logAudit(
    session.userId,
    "academics.assessment_recorded",
    `Assessment ${assessment.id} (${assessment.examLabel}, ${assessment.scorePercent}%) recorded for student ${assessment.studentId}` +
      (alert ? ` — opened academic alert ${alert.id}` : "")
  );

  return NextResponse.json(assessment, { status: 201 });
}
