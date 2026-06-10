import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "./config/env";
import { applySecurityMiddleware } from "./middleware/security";
import { generalLimiter, speedLimiter } from "./middleware/rateLimiter";
import { sanitizeInput } from "./middleware/sanitize";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import v1Router from "./api/v1/index";

const app = express();

app.set("trust proxy", 1);

// ── 1. Security headers (helmet + hpp + disable x-powered-by) ─────────────────
applySecurityMiddleware(app);

// ── 2. CORS — strict origin allowlist ─────────────────────────────────────────
// Exact-match origins: local dev + the configured production frontend(s).
// CORS_ORIGINS (comma-separated) lets ops add domains without a redeploy
// (e.g. a future custom domain like https://elioswholesale.in). Trailing
// slashes are stripped so a value like "https://site/" still matches the
// browser Origin header (which never has one).
const staticAllowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS?.split(",") ?? []),
  "https://elioswholesale.in",
  "https://www.elioswholesale.in",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
]
  .map((o) => o?.trim().replace(/\/$/, ""))
  .filter((o): o is string => Boolean(o));

// Pattern-match origins: this project's Vercel preview deployments. Each deploy
// gets a unique hash (e.g. elioswholesale-<hash>-palaashika26-3692s-projects
// .vercel.app), so they can't be enumerated in a static list. Scoped to the
// project name + team slug so arbitrary *.vercel.app sites are NOT allowed.
const allowedOriginPatterns = [
  /^https:\/\/elioswholesale-[a-z0-9-]+-palaashika26-3692s-projects\.vercel\.app$/,
];

const isOriginAllowed = (origin: string): boolean =>
  staticAllowedOrigins.includes(origin) ||
  allowedOriginPatterns.some((pattern) => pattern.test(origin));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header (Postman, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (isOriginAllowed(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── 3. Rate limiting — applied globally before any route ──────────────────────
app.use(generalLimiter);

// ── 4. Speed limiter — slows down heavy hitters before they hit the limit ──────
app.use(speedLimiter);

// ── 5. Body + cookie parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// ── 6. Input sanitization — strip $-prefixed and dot-path keys ───────────────
app.use(sanitizeInput);

// ── 7. Health check (public, no auth required) ────────────────────────────────
app.get("/api/v1/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Elios API is running",
    timestamp: new Date(),
  });
});

// ── 8. API v1 routes ──────────────────────────────────────────────────────────
app.use("/api/v1", v1Router);

// ── 9 & 10. 404 handler + global error handler — must be last ─────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
