import dotenv from "dotenv";

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} environment variable is required`);
  return value;
}

const config = {
  PORT: parseInt(process.env.PORT || "4000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
  FRONTEND_URL: process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000",

  // Database
  DATABASE_URL: required("DATABASE_URL"),

  // Legacy secret (kept for backwards compat)
  JWT_SECRET: required("JWT_SECRET"),

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

  // Web Push (VAPID)
  VAPID_PUBLIC_KEY:  process.env.VAPID_PUBLIC_KEY  || "",
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || "",
  VAPID_EMAIL:       process.env.VAPID_EMAIL        || "mailto:noreply@elioswholesale.in",
};

export default config;
