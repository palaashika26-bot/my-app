import { Request, Response, NextFunction } from "express";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import config from "../config/env";
import { ApiError } from "../utils/ApiError";

interface JwtAccessPayload {
  userId: string;
  role: string;
}

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw ApiError.unauthorized("No token provided");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtAccessPayload;
    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      throw new ApiError(401, "Token expired");
    }
    throw ApiError.unauthorized("Invalid token");
  }
};
