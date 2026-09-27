import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  studentId: z.string().min(1),
  subjectId: z.string().min(1),
  teacherId: z.string().min(1),
  description: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid task data." }, { status: 400 });
  }

  const task = await db.task.create({ data: parsed.data });
  await logAudit(session.userId, "task.assigned", `Task ${task.id} assigned to student ${task.studentId}`);

  return NextResponse.json(task, { status: 201 });
}
