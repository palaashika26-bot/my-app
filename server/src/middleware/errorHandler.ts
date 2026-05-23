import { Request, Response, NextFunction } from "express";
import config from "../config/env";
import { ApiError } from "../utils/ApiError";

interface PrismaError extends Error {
  code?: string;
}

// Safe Prisma error messages — never expose raw DB details to clients
const PRISMA_ERROR_MAP: Record<string, { status: number; message: string }> = {
  P2002: { status: 409, message: "A record with this value already exists" },
  P2025: { status: 404, message: "Record not found" },
  P2003: { status: 400, message: "Invalid reference: related record not found" },
};

export const errorHandler = (
  err: PrismaError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const isDevelopment = config.NODE_ENV === "development";

  // Always log the full error internally for observability
  if (isDevelopment) {
    console.error(`[ERROR] ${req.method} ${req.path}`, err);
  } else {
    // Structured log in production — never contains stack or raw db details
    console.error(
      JSON.stringify({
        level: "error",
        method: req.method,
        path: req.path,
        message: err.message,
        code: (err as PrismaError).code,
        timestamp: new Date().toISOString(),
      })
    );
  }

  // ── Known ApiError (thrown intentionally by repository / service) ──────────
  if (err instanceof ApiError) {
    const body: Record<string, unknown> = {
      success: false,
      message: err.message,
    };
    if (err.errors?.length) {
      body.errors = err.errors;
    }
    // Stack only in development — NEVER in production
    if (isDevelopment) {
      body.stack = err.stack;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  // ── Known Prisma errors — map to safe HTTP responses ──────────────────────
  if (err.code && PRISMA_ERROR_MAP[err.code]) {
    const { status, message } = PRISMA_ERROR_MAP[err.code];
    res.status(status).json({ success: false, message });
    return;
  }

  // ── Unknown Prisma or other library errors ─────────────────────────────────
  if (err.code?.startsWith("P")) {
    res.status(500).json({ success: false, message: "Something went wrong" });
    return;
  }

  // ── CORS error ─────────────────────────────────────────────────────────────
  if (err.message === "Not allowed by CORS") {
    res.status(403).json({ success: false, message: "Origin not allowed" });
    return;
  }

  // ── Fallback 500 — never leak stack or raw message in production ───────────
  res.status(500).json({
    success: false,
    message: isDevelopment ? err.message : "Internal server error",
    ...(isDevelopment && { stack: err.stack }),
  });
};
