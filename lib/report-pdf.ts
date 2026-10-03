import { rgb, type PDFPage } from "pdf-lib";
import { createPdf, drawLine, drawParagraph } from "@/lib/pdf-text";
import type { MonthlyReportData } from "@/lib/monthly-report";

const BLUE = rgb(0.09, 0.27, 0.62);
const GREY = rgb(0.4, 0.4, 0.4);

export async function generateMonthlyReportPdf(data: MonthlyReportData): Promise<Uint8Array> {
  const { doc, fonts } = await createPdf();
  const left = 50;
  const width = 495;
  let page: PDFPage = doc.addPage([595.28, 841.89]);
  let y = 790;

  // Start a fresh page if less than `needed` points remain.
  const ensureSpace = (needed: number) => {
    if (y - needed < 60) {
      page = doc.addPage([595.28, 841.89]);
      y = 790;
    }
  };

  drawLine(page, fonts, "MSA -- Make Studying Amazing", { x: left, y, size: 18, bold: true, color: BLUE });
  y -= 20;
  drawLine(page, fonts, `AS HUB | Monthly Progress Report | ${data.monthLabel}`, {
    x: left, y, size: 11, color: GREY,
  });
  y -= 36;

  drawLine(page, fonts, data.studentName, { x: left, y, size: 16, bold: true });
  y -= 20;
  drawLine(page, fonts, `${data.msaId}  |  ${data.grade}`, { x: left, y, size: 11, color: GREY });
  y -= 34;

  const attendanceText =
    data.attendance.percent != null
      ? `${data.attendance.percent}%  (${data.attendance.daysAttended} of ${data.attendance.centerDays} days)`
      : "No attendance recorded";
  const tasksText = data.tasks.total > 0 ? `${data.tasks.completed} / ${data.tasks.total} completed` : "No tasks assigned";

  const stat = (label: string, value: string) => {
    drawLine(page, fonts, label, { x: left, y, size: 11, bold: true });
    drawLine(page, fonts, value, { x: left + 130, y, size: 11 });
    y -= 22;
  };
  stat("Attendance", attendanceText);
  stat("Tasks", tasksText);
  y -= 14;

  drawLine(page, fonts, "Subject performance", { x: left, y, size: 13, bold: true, color: BLUE });
  y -= 22;
  if (data.subjects.length === 0) {
    drawLine(page, fonts, "No assessments were recorded this month.", { x: left, y, size: 11, color: GREY });
    y -= 22;
  } else {
    drawLine(page, fonts, "Subject", { x: left, y, size: 10, bold: true, color: GREY });
    drawLine(page, fonts, "Average", { x: left + 250, y, size: 10, bold: true, color: GREY });
    drawLine(page, fonts, "vs last month", { x: left + 340, y, size: 10, bold: true, color: GREY });
    y -= 18;
    for (const s of data.subjects) {
      ensureSpace(24);
      const delta =
        s.deltaVsPrevious == null ? "--" : s.deltaVsPrevious === 0 ? "no change" : `${s.deltaVsPrevious > 0 ? "+" : ""}${s.deltaVsPrevious} pts`;
      drawLine(page, fonts, s.name, { x: left, y, size: 11 });
      drawLine(page, fonts, `${s.average}%`, { x: left + 250, y, size: 11 });
      drawLine(page, fonts, delta, {
        x: left + 340, y, size: 11,
        color: s.deltaVsPrevious == null ? GREY : s.deltaVsPrevious >= 0 ? rgb(0.1, 0.5, 0.2) : rgb(0.75, 0.15, 0.15),
      });
      y -= 20;
    }
  }
  y -= 14;

  drawLine(page, fonts, "Teacher assessment", { x: left, y, size: 13, bold: true, color: BLUE });
  y -= 6;
  if (!data.teacher.written) {
    y -= 14;
    drawLine(page, fonts, "Auto-generated from this month's grades; the teacher has not added notes yet.", {
      x: left, y, size: 9, color: GREY,
    });
  }
  y -= 22;

  const section = (title: string, body: string) => {
    ensureSpace(60);
    drawLine(page, fonts, title, { x: left, y, size: 11, bold: true });
    y -= 18;
    y = drawParagraph(page, fonts, body || "--", { x: left, y, size: 11, maxWidth: width });
    y -= 12;
  };
  section("Strengths", data.teacher.strengths);
  section("Areas to improve", data.teacher.areasToImprove);
  section("Recommendations", data.teacher.recommendations);

  return doc.save();
}
