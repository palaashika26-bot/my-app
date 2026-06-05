import nodemailer from "nodemailer";
import config from "./env";

export const transporter = nodemailer.createTransport({
  host: config.EMAIL_HOST,
  port: config.EMAIL_PORT,
  secure: false,
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASS,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email. Returns `true` on success and `false` on failure.
 *
 * The underlying error is logged server-side but never thrown, so existing
 * fire-and-forget callers (notifications, receipts) keep working. Callers that
 * MUST react to a delivery failure — e.g. the email-verification step during
 * registration — should check the returned boolean and surface the problem to
 * the user instead of assuming the message was delivered.
 */
export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: config.EMAIL_FROM,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
    return false;
  }
}
