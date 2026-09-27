import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canOperateKiosk } from "@/lib/rbac";

const schema = z.object({ token: z.string().min(1) });

function formatDuration(checkIn: Date, checkOut: Date) {
  const ms = checkOut.getTime() - checkIn.getTime();
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canOperateKiosk(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid scan." }, { status: 400 });

  const { token } = parsed.data;

  const student = await db.student.findUnique({ where: { qrToken: token } });
  const teacher = student
    ? null
    : await db.teacher.findUnique({ where: { qrToken: token }, include: { user: true } });

  if (!student && !teacher) {
    return NextResponse.json({ error: "Unknown QR code." }, { status: 404 });
  }

  const openWhere = student
    ? { studentId: student.id, checkOutAt: null }
    : { teacherId: teacher!.id, checkOutAt: null };
  const open = await db.attendanceRecord.findFirst({ where: openWhere, orderBy: { checkInAt: "desc" } });

  const name = student ? student.fullName : teacher!.user.fullName;

  if (open) {
    const closed = await db.attendanceRecord.update({
      where: { id: open.id },
      data: { checkOutAt: new Date() },
    });
    await logAudit(session.userId, "attendance.check_out", `${name} checked out`);
    return NextResponse.json({
      name,
      type: "out",
      time: closed.checkOutAt!.toLocaleTimeString(),
      duration: formatDuration(closed.checkInAt, closed.checkOutAt!),
    });
  }

  const created = await db.attendanceRecord.create({
    data: student ? { studentId: student.id } : { teacherId: teacher!.id },
  });
  await logAudit(session.userId, "attendance.check_in", `${name} checked in`);

  return NextResponse.json({ name, type: "in", time: created.checkInAt.toLocaleTimeString() });
}
