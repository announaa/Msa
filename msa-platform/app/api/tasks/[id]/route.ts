import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "NEEDS_REVIEW", "COULD_NOT_COMPLETE"]),
  understanding: z.enum(["EXCELLENT", "GOOD", "NEEDS_SUPPORT"]).nullable().optional(),
  note: z.string().max(2000).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await db.task.findUnique({ where: { id: params.id }, include: { teacher: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed =
    session.role === "OWNER" ||
    session.role === "MANAGER" ||
    (session.role === "TEACHER" && existing.teacher.userId === session.userId);

  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data." }, { status: 400 });

  const statusChanged = parsed.data.status !== existing.status;

  const task = await db.task.update({
    where: { id: params.id },
    data: {
      status: parsed.data.status,
      understanding: parsed.data.understanding ?? null,
      note: parsed.data.note,
      completedAt: parsed.data.status === "COMPLETED" ? new Date() : existing.completedAt,
      ...(statusChanged ? { statusEvents: { create: { status: parsed.data.status } } } : {}),
    },
  });

  await logAudit(
    session.userId,
    "task.status_changed",
    `Task ${task.id} set to ${task.status}${task.understanding ? ` (${task.understanding})` : ""}`
  );

  return NextResponse.json(task);
}
