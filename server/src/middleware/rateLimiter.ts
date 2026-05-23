import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";

// ── General API limiter — applied to ALL routes ───────────────────────────────
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per IP per window
  message: {
    success: false,
    message: "Too many requests, please try again after 15 minutes",
  },
  standardHeaders: true,  // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,   // Disable the X-RateLimit-* headers
});

// ── Auth limiter — strict, only for login / register routes ──────────────────
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // only 10 attempts per IP
  message: {
    success: false,
    message: "Too many login attempts, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only failed attempts count toward the limit
});

// ── Speed limiter — slows down repeat requesters before outright blocking ─────
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50,            // start adding delay after 50 requests
  delayMs: (hits) => hits * 100, // add 100 ms per extra request beyond limit
});

// ── Search limiter — search hits the DB harder, tighter window ────────────────
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  message: {
    success: false,
    message: "Too many search requests",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
