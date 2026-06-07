import dotenv from "dotenv";

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} environment variable is required`);
  return value;
}

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

// Resolve a public URL from the first of `keys` that is set. In production there
// is deliberately NO localhost fallback — a missing value throws so the
// misconfiguration is caught loudly instead of silently emailing localhost links.
function requiredUrl(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) return value.trim();
  }
  if (IS_PRODUCTION) {
    throw new Error(
      `One of [${keys.join(", ")}] must be set in production (no localhost fallback is allowed)`
    );
  }
  return "http://localhost:3000";
}

const config = {
  PORT: parseInt(process.env.PORT || "4000", 10),
  NODE_ENV,
  CLIENT_URL: requiredUrl("CLIENT_URL", "FRONTEND_URL"),
  FRONTEND_URL: requiredUrl("FRONTEND_URL", "CLIENT_URL"),

  // Database
  DATABASE_URL: required("DATABASE_URL"),

  // Legacy secret (kept for backwards compat). Optional — the app signs and
  // verifies with JWT_ACCESS_SECRET / JWT_REFRESH_SECRET, so a missing value
  // must not crash boot.
  JWT_SECRET: process.env.JWT_SECRET || "",

  // Access token — long-lived (24h)
  JWT_ACCESS_SECRET: required("JWT_ACCESS_SECRET"),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "24h",

  // Refresh token — long-lived (7d)
  JWT_REFRESH_SECRET: required("JWT_REFRESH_SECRET"),
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  // Email (SMTP)
  EMAIL_HOST: process.env.EMAIL_HOST || "smtp.gmail.com",
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || "587", 10),
  EMAIL_USER: process.env.EMAIL_USER || "",
  EMAIL_PASS: process.env.EMAIL_PASS || "",
  EMAIL_FROM: process.env.EMAIL_FROM || "Elios <noreply@elioswholesale.in>",

  // Brevo (Sendinblue) HTTP API key. When set, mail is sent over HTTPS instead
  // of SMTP — required on Render, which blocks outbound SMTP ports (25/465/587).
  BREVO_API_KEY: process.env.BREVO_API_KEY || "",

  // Web Push (VAPID)
  VAPID_PUBLIC_KEY:  process.env.VAPID_PUBLIC_KEY  || "",
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || "",
  VAPID_EMAIL:       process.env.VAPID_EMAIL        || "mailto:noreply@elioswholesale.in",

  // Google OAuth
  GOOGLE_CLIENT_ID:     process.env.GOOGLE_CLIENT_ID     || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",

  // Password reset
  RESET_PASSWORD_TOKEN_SECRET: process.env.RESET_PASSWORD_TOKEN_SECRET || "",
  RESET_PASSWORD_EXPIRES_IN: process.env.RESET_PASSWORD_EXPIRES_IN || "1h",
};

export default config;
