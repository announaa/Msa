import nodemailer from "nodemailer";

// Phase 1 only needs this for the "here are your login credentials"
// email sent when a Manager accepts a registration request. The full
// notification system (event toggles, WhatsApp, scheduled sends) is
// Phase 3 per the delivery plan — this stays deliberately small.
export async function sendMail(to: string, subject: string, text: string) {
  const host = process.env.SMTP_HOST;

  if (!host) {
    // No SMTP configured (e.g. local dev) — log instead of failing so
    // the registration flow still completes end to end.
    console.log(`[mailer] would send to ${to}: ${subject}\n${text}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "MSA <no-reply@ascommunity.com>",
    to,
    subject,
    text,
  });
}
