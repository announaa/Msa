import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { generateMsaId, generateTempPassword } from "@/lib/ids";
import { sendMail } from "@/lib/mailer";

const schema = z.object({ decision: z.enum(["ACCEPTED", "REJECTED"]) });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  }

  const request = await db.registrationRequest.findUnique({ where: { id: params.id } });
  if (!request || request.status !== "PENDING") {
    return NextResponse.json({ error: "Not found or already decided." }, { status: 404 });
  }

  if (parsed.data.decision === "REJECTED") {
    await db.registrationRequest.update({
      where: { id: request.id },
      data: { status: "REJECTED", decidedAt: new Date() },
    });
    await logAudit(session.userId, "registration.rejected", `Rejected registration for ${request.studentName}`);
    return NextResponse.json({ status: "REJECTED" });
  }

  // ACCEPTED — auto-create the Student (with MSA ID) + Parent account,
  // then email the parent their login credentials, per section 4.11.
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const parentEmail =
    request.parentEmail || `${request.parentPhone.replace(/\D/g, "")}@placeholder.ascommunity.com`;

  const result = await db.$transaction(async (tx) => {
    const parentUser = await tx.user.create({
      data: { email: parentEmail, passwordHash, role: "PARENT", fullName: request.parentName },
    });

    const parentGuardian = await tx.parentGuardian.create({
      data: { userId: parentUser.id, phone: request.parentPhone },
    });

    const student = await tx.student.create({
      data: {
        msaId: generateMsaId(),
        fullName: request.studentName,
        dateOfBirth: request.dateOfBirth ?? new Date(),
        grade: request.grade,
        school: request.school,
        parents: { connect: { id: parentGuardian.id } },
      },
    });

    await tx.registrationRequest.update({
      where: { id: request.id },
      data: {
        status: "ACCEPTED",
        decidedAt: new Date(),
        createdStudentId: student.id,
        createdParentId: parentUser.id,
      },
    });

    return { student, parentUser };
  });

  await logAudit(
    session.userId,
    "registration.accepted",
    `Accepted registration for ${request.studentName} -> student ${result.student.id}, parent ${result.parentUser.id}`
  );

  await sendMail(
    parentEmail,
    "Your MSA account is ready",
    `Welcome to MSA!\n\nLogin email: ${parentEmail}\nTemporary password: ${tempPassword}\n\nPlease log in and change your password.`
  );

  return NextResponse.json({ status: "ACCEPTED", studentId: result.student.id, tempPassword });
}
