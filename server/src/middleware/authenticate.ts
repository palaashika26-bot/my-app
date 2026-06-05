import { Request, Response, NextFunction } from "express";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import config from "../config/env";
import { ApiError } from "../utils/ApiError";
import prisma from "../config/prisma";

interface JwtAccessPayload {
  userId: string;
  role: string;
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("No token provided"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtAccessPayload;

    // For CLIENT accounts, verify email and approval status on every request
    if (decoded.role === "CLIENT") {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { isEmailVerified: true, isApproved: true },
      });
      if (!user || !user.isEmailVerified) {
        return next(new ApiError(401, "Please verify your email first"));
      }
      if (!user.isApproved) {
        return next(new ApiError(401, "Your account is not yet active"));
      }
    }

    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return next(new ApiError(401, "Token expired"));
    }
    if (err instanceof ApiError) {
      return next(err);
    }
    return next(ApiError.unauthorized("Invalid token"));
  }
};
