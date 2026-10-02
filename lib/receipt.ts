import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  const left = 50;

  page.drawText("MSA -- Make Studying Amazing", { x: left, y, size: 18, font: bold, color: rgb(0.09, 0.27, 0.62) });
  y -= 20;
  page.drawText("AS HUB | Payment Receipt", { x: left, y, size: 11, font, color: rgb(0.35, 0.35, 0.35) });
  y -= 40;

  const line = (label: string, value: string) => {
    page.drawText(label, { x: left, y, size: 11, font: bold });
    page.drawText(value, { x: left + 160, y, size: 11, font });
    y -= 22;
  };

  line("Receipt #", data.receiptNumber);
  line("Date", data.paidAt.toLocaleDateString("en-CA"));
  line("Student", `${data.studentName} (${data.msaId})`);
  if (data.invoiceLabel) line("For", data.invoiceLabel);
  line("Amount", data.amountLabel);
  line("Method", data.method);
  if (data.note) line("Note", data.note);

  y -= 20;
  page.drawLine({ start: { x: left, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  y -= 20;
  page.drawText("Thank you for your payment.", { x: left, y, size: 10, font, color: rgb(0.45, 0.45, 0.45) });

  return doc.save();
}
