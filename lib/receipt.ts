import { rgb } from "pdf-lib";
import { createPdf, drawLine, drawParagraph } from "@/lib/pdf-text";

export async function generateReceiptPdf(data: {
  receiptNumber: string;
  studentName: string;
  msaId: string;
  amountLabel: string;
  method: string;
  paidAt: Date;
  note?: string | null;
  invoiceLabel?: string | null;
}): Promise<Uint8Array> {
  const { doc, fonts } = await createPdf();
  const page = doc.addPage([595.28, 841.89]); // A4

  let y = 780;
  const left = 50;

  drawLine(page, fonts, "MSA -- Make Studying Amazing", {
    x: left, y, size: 18, bold: true, color: rgb(0.09, 0.27, 0.62),
  });
  y -= 20;
  drawLine(page, fonts, "AS HUB | Payment Receipt", { x: left, y, size: 11, color: rgb(0.35, 0.35, 0.35) });
  y -= 40;

  const line = (label: string, value: string) => {
    drawLine(page, fonts, label, { x: left, y, size: 11, bold: true });
    drawLine(page, fonts, value, { x: left + 160, y, size: 11 });
    y -= 22;
  };

  line("Receipt #", data.receiptNumber);
  line("Date", data.paidAt.toLocaleDateString("en-CA"));
  line("Student", `${data.studentName} (${data.msaId})`);
  if (data.invoiceLabel) line("For", data.invoiceLabel);
  line("Amount", data.amountLabel);
  line("Method", data.method);
  if (data.note) {
    drawLine(page, fonts, "Note", { x: left, y, size: 11, bold: true });
    y = drawParagraph(page, fonts, data.note, { x: left + 160, y, size: 11, maxWidth: 335 });
  }

  y -= 20;
  page.drawLine({ start: { x: left, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  y -= 20;
  drawLine(page, fonts, "Thank you for your payment.", { x: left, y, size: 10, color: rgb(0.45, 0.45, 0.45) });

  return doc.save();
}
