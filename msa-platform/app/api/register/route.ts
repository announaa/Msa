import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  studentName: z.string().min(1),
  dateOfBirth: z.string().optional(),
  school: z.string().optional(),
  grade: z.string().min(1),
  requestedSubjects: z.array(z.string()).default([]),
  parentName: z.string().min(1),
  parentPhone: z.string().min(3),
  parentEmail: z.string().email().optional().or(z.literal("")),
  preferredTimes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid registration data." }, { status: 400 });
  }

  const data = parsed.data;

  const request = await db.registrationRequest.create({
    data: {
      studentName: data.studentName,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      school: data.school,
      grade: data.grade,
      requestedSubjects: data.requestedSubjects,
      parentName: data.parentName,
      parentPhone: data.parentPhone,
      parentEmail: data.parentEmail || undefined,
      preferredTimes: data.preferredTimes,
    },
  });

  // No actor — this is a public, unauthenticated submission.
  await logAudit(null, "registration.submitted", `Registration request ${request.id} for ${data.studentName}`);

  return NextResponse.json({ id: request.id }, { status: 201 });
}
