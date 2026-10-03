import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canViewStudentData } from "@/lib/access";
import { buildMonthlyReport, MONTH_RE } from "@/lib/monthly-report";
import { generateMonthlyReportPdf } from "@/lib/report-pdf";

export async function GET(req: NextRequest, { params }: { params: { studentId: string; month: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!MONTH_RE.test(params.month)) {
    return NextResponse.json({ error: "Month must look like 2026-09." }, { status: 400 });
  }

  const allowed = await canViewStudentData(session.role, session.userId, params.studentId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await buildMonthlyReport(params.studentId, params.month);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pdfBytes = await generateMonthlyReportPdf(data);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="MSA-report-${data.msaId}-${params.month}.pdf"`,
    },
  });
}
