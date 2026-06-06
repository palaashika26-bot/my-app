import nodemailer from "nodemailer";
import config from "./env";

// SMTP transport — used as a fallback for local development only. Render blocks
// outbound SMTP, so production sends via the Brevo HTTP API instead (see below).
// The timeouts stop a blocked SMTP port from hanging a request for ~2 minutes.
export const transporter = nodemailer.createTransport({
  host: config.EMAIL_HOST,
  port: config.EMAIL_PORT,
  secure: false,
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASS,
  },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Split an "Elios <elios@example.com>" string into a Brevo sender object.
function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1] || "Elios", email: match[2].trim() };
  return { name: "Elios", email: from.trim() };
}

// Send over HTTPS via Brevo's transactional email API. Works on hosts that block
// SMTP. The sender address must be a verified sender (or domain) in Brevo.
async function sendViaBrevo({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": config.BREVO_API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: parseSender(config.EMAIL_FROM),
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
      signal: controller.signal,
    });
    if (res.ok) {
      console.log(`Email sent (Brevo) to ${to}: ${subject}`);
      return true;
    }
    const body = await res.text().catch(() => "");
    console.error(`Brevo send failed (${res.status}) to ${to}: ${body}`);
    return false;
  } catch (err) {
    console.error(`Brevo send error to ${to}:`, err);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function sendViaSmtp({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({ from: config.EMAIL_FROM, to, subject, html });
    console.log(`Email sent (SMTP) to ${to}: ${subject}`);
    return true;
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
    return false;
  }
}

/**
 * Sends an email. Returns `true` on success and `false` on failure.
 *
 * Uses the Brevo HTTP API when BREVO_API_KEY is set (required in production,
 * since Render blocks outbound SMTP) and falls back to SMTP for local dev.
 *
 * The underlying error is logged server-side but never thrown, so existing
 * fire-and-forget callers (notifications, receipts) keep working. Callers that
 * MUST react to a delivery failure — e.g. the email-verification step during
 * registration — should check the returned boolean and surface the problem to
 * the user instead of assuming the message was delivered.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  if (config.BREVO_API_KEY) return sendViaBrevo(opts);
  return sendViaSmtp(opts);
}
