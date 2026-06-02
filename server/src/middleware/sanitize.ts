import { Request, Response, NextFunction } from "express";
import { ParsedQs } from "qs";

/**
 * Strip keys that start with "$" or contain "." from body and query.
 * Prevents NoSQL-style injection payloads passed as JSON (e.g. { "$where": "1=1" }).
 * Trims string whitespace but does NOT truncate — base64 image fields need full length.
 */
export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === "object") {
    // ParsedQs is compatible — double-cast through unknown to satisfy strict TS
    req.query = sanitizeObject(req.query) as unknown as ParsedQs;
  }
  next();
};

function sanitizeObject(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const clean: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    // Drop keys starting with "$" (Mongo operators) or containing "." (path traversal)
    if (key.startsWith("$") || key.includes(".")) continue;

    const value = (obj as Record<string, unknown>)[key];

    if (typeof value === "object" && value !== null) {
      clean[key] = sanitizeObject(value);
    } else if (typeof value === "string") {
      // Trim whitespace only — do NOT truncate (base64 images need full length)
      clean[key] = value.trim();
    } else {
      clean[key] = value;
    }
  }
  return clean;
}
