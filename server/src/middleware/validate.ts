import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Zod schema validation middleware for request bodies.
 * Returns 422 with field-level error messages on failure.
 */
export const validate = (schema: ZodSchema) => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = (result.error as ZodError).issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    res.status(422).json({
      success: false,
      message: "Validation failed",
      errors,
    });
    return;
  }

  // Replace req.body with the parsed (and coerced) data
  req.body = result.data;
  next();
};

/**
 * Validates common query parameters on list endpoints.
 * Rejects absurd pagination values before they reach the service layer.
 */
export const validateQueryParams = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { page, limit } = req.query;

  if (page !== undefined) {
    const pageNum = Number(page);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > 10000) {
      res.status(400).json({
        success: false,
        message: "Invalid page parameter",
      });
      return;
    }
  }

  if (limit !== undefined) {
    const limitNum = Number(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      res.status(400).json({
        success: false,
        message: "Limit cannot exceed 100",
      });
      return;
    }
  }

  next();
};
