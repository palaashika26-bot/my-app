import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";

/**
 * Role-based authorization guard.
 * Must be used AFTER authenticate middleware.
 *
 * Usage: router.get("/", authenticate, authorize(["ADMIN", "STAFF"]), handler)
 */
export const authorize = (roles: string[]) => (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    throw ApiError.unauthorized("Authentication required");
  }

  if (!roles.includes(req.user.role)) {
    throw ApiError.forbidden("You do not have permission for this action");
  }

  next();
};
