import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  const password = await hash("password123");

  const owner = await db.user.create({
    data: { email: "owner@msa.test", passwordHash: password, role: "OWNER", fullName: "Hussein Owner", locale: "ar" },
  });

  const manager = await db.user.create({
    data: {
      email: "manager@msa.test",
      passwordHash: password,
      role: "MANAGER",
      fullName: "Sara Manager",
      locale: "ar",
    },
  });

  const math = await db.subject.create({ data: { name: "Mathematics" } });
  const english = await db.subject.create({ data: { name: "English" } });
  const science = await db.subject.create({ data: { name: "Science" } });

  const teacherUser1 = await db.user.create({
    data: {
      email: "teacher1@msa.test",
      passwordHash: password,
      role: "TEACHER",
      fullName: "Mr. Khalil",
      locale: "ar",
    },
  });
  const teacher1 = await db.teacher.create({
    data: { userId: teacherUser1.id, subjects: { connect: [{ id: math.id }, { id: science.id }] } },
  });

  const teacherUser2 = await db.user.create({
    data: {
      email: "teacher2@msa.test",
      passwordHash: password,
      role: "TEACHER",
      fullName: "Ms. Farah",
      locale: "en",
    },
  });
  const teacher2 = await db.teacher.create({
    data: { userId: teacherUser2.id, subjects: { connect: [{ id: english.id }] } },
  });

  const parentUser1 = await db.user.create({
    data: {
      email: "parent1@msa.test",
      passwordHash: password,
      role: "PARENT",
      fullName: "Ahmad Parent",
      locale: "ar",
    },
  });
  const parent1 = await db.parentGuardian.create({ data: { userId: parentUser1.id, phone: "+1-613-555-0101" } });

  const parentUser2 = await db.user.create({
    data: {
      email: "parent2@msa.test",
      passwordHash: password,
      role: "PARENT",
      fullName: "Lina Parent",
      locale: "en",
    },
  });
  const parent2 = await db.parentGuardian.create({ data: { userId: parentUser2.id, phone: "+1-613-555-0102" } });

  const student1 = await db.student.create({
    data: {
      msaId: "MSA-2026-1001",
      fullName: "Youssef Ahmad",
      dateOfBirth: new Date("2014-03-12"),
      grade: "Grade 7",
      school: "Ottawa Public School",
      parents: { connect: { id: parent1.id } },
      subjects: { connect: [{ id: math.id }, { id: science.id }] },
    },
  });

  const student2 = await db.student.create({
    data: {
      msaId: "MSA-2026-1002",
      fullName: "Nour Ahmad",
      dateOfBirth: new Date("2016-07-04"),
      grade: "Grade 5",
      school: "Ottawa Public School",
      parents: { connect: { id: parent1.id } },
      subjects: { connect: [{ id: english.id }] },
    },
  });

  await db.student.create({
    data: {
      msaId: "MSA-2026-1003",
      fullName: "Karim Farah",
      dateOfBirth: new Date("2013-11-20"),
      grade: "Grade 8",
      school: "Gatineau Secondary",
      parents: { connect: { id: parent2.id } },
      subjects: { connect: [{ id: math.id }, { id: english.id }] },
    },
  });

  // A student who also has their own login (Phase 1 supports a Student account).
  const studentUser = await db.user.create({
    data: {
      email: "student1@msa.test",
      passwordHash: password,
      role: "STUDENT",
      fullName: "Youssef Ahmad",
      locale: "ar",
    },
  });
  await db.student.update({ where: { id: student1.id }, data: { userId: studentUser.id } });

  const task1 = await db.task.create({
    data: {
      studentId: student1.id,
      subjectId: math.id,
      teacherId: teacher1.id,
      description: "Homework p.25 — fractions",
      status: "IN_PROGRESS",
    },
  });
  await db.taskStatusEvent.create({ data: { taskId: task1.id, status: "IN_PROGRESS" } });

  const task2 = await db.task.create({
    data: {
      studentId: student1.id,
      subjectId: science.id,
      teacherId: teacher1.id,
      description: "Read chapter 3 — the water cycle",
      status: "COMPLETED",
      understanding: "GOOD",
      note: "Followed along well, needs a bit more practice with diagrams.",
      completedAt: new Date(),
    },
  });
  await db.taskStatusEvent.create({ data: { taskId: task2.id, status: "IN_PROGRESS" } });
  await db.taskStatusEvent.create({ data: { taskId: task2.id, status: "COMPLETED" } });

  await db.task.create({
    data: {
      studentId: student2.id,
      subjectId: english.id,
      teacherId: teacher2.id,
      description: "Vocabulary quiz — unit 4",
      status: "NOT_STARTED",
    },
  });

  await db.attendanceRecord.create({ data: { studentId: student1.id } }); // still checked in
  await db.attendanceRecord.create({ data: { teacherId: teacher1.id } });

  // Finance demo data: student1 is paid up, student2 has an overdue invoice.
  await db.student.update({ where: { id: student1.id }, data: { monthlyFeeCents: 25000 } });
  await db.student.update({ where: { id: student2.id }, data: { monthlyFeeCents: 20000 } });

  const paidInvoice = await db.invoice.create({
    data: {
      studentId: student1.id,
      periodLabel: "September 2026",
      amountCents: 25000,
      dueDate: new Date("2026-09-05"),
      status: "PAID",
    },
  });
  await db.payment.create({
    data: {
      studentId: student1.id,
      invoiceId: paidInvoice.id,
      amountCents: 25000,
      method: "E_TRANSFER",
      paidAt: new Date("2026-09-03"),
      recordedById: manager.id,
    },
  });

  await db.invoice.create({
    data: {
      studentId: student2.id,
      periodLabel: "September 2026",
      amountCents: 20000,
      dueDate: new Date("2026-09-05"), // left unpaid, on purpose, as a demo case
    },
  });

  // Set directly rather than importing lib/finance.ts's recomputeStudentFinance
  // here (that module uses the Next.js "@/" path alias, which this standalone
  // tsx script doesn't resolve) — these match exactly what that function would
  // compute: student1 fully paid -> ACTIVE; student2's Sept invoice is unpaid
  // and more than 7 days past its due date -> OVERDUE.
  await db.student.update({ where: { id: student1.id }, data: { accountStatus: "ACTIVE" } });
  await db.student.update({ where: { id: student2.id }, data: { accountStatus: "OVERDUE" } });

  await db.announcement.create({
    data: {
      title: "Fall term registration is open",
      body: "Enroll your child for the fall term — spots are limited.",
    },
  });
  await db.announcement.create({
    data: { title: "Parent-teacher evening — Oct 15", body: "Meet your child's teachers at MSA, 5–8 PM." },
  });

  await db.registrationRequest.create({
    data: {
      studentName: "Layla Haddad",
      grade: "Grade 6",
      school: "Ottawa Public School",
      requestedSubjects: ["Mathematics", "English"],
      parentName: "Rana Haddad",
      parentPhone: "+1-613-555-0199",
      parentEmail: "rana.haddad@example.com",
      preferredTimes: "Weekday evenings",
    },
  });

  console.log("Seed complete. All demo accounts use password: password123");
  console.log({
    owner: owner.email,
    manager: manager.email,
    teachers: [teacherUser1.email, teacherUser2.email],
    parents: [parentUser1.email, parentUser2.email],
    student: studentUser.email,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
