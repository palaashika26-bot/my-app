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

// ── 1. Security headers (helmet + hpp + disable x-powered-by) ─────────────────
applySecurityMiddleware(app);

// ── 2. CORS — strict origin whitelist ─────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:3000",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header (Postman, curl, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
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
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
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
