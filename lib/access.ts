import { db } from "@/lib/db";

// Can this user see data about this student (grades, reports, ...)?
// Owner/Manager: anyone. Parent: their own children. Teacher: students
// who share a subject with them. Student: themselves. The same rule the
// students/journey/academics pages each apply inline — new code should
// call this instead of copying it again.
export async function canViewStudentData(role: string, userId: string, studentId: string): Promise<boolean> {
  if (role === "OWNER" || role === "MANAGER") return true;
  if (role === "PARENT") {
    return !!(await db.parentGuardian.findFirst({ where: { userId, students: { some: { id: studentId } } } }));
  }
  if (role === "TEACHER") {
    return !!(await db.teacher.findFirst({
      where: { userId, subjects: { some: { students: { some: { id: studentId } } } } },
    }));
  }
  if (role === "STUDENT") {
    return !!(await db.student.findFirst({ where: { userId, id: studentId } }));
  }
  return false;
}
