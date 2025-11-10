import nodemailer from "nodemailer";

function buildTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return null;
  try {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user, pass },
    });
  } catch {
    return null;
  }
}

export async function sendEmail(to, subject, html) {
  const transporter = buildTransporter();
  if (!transporter) {
    console.log("[MAIL:FALLBACK]", { to, subject });
    return { queued: false, reason: "no-transporter" };
  }
  try {
    const info = await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html });
    return { queued: true, id: info.messageId };
  } catch (e) {
    console.error("sendEmail error:", e);
    return { queued: false, error: e };
  }
}

