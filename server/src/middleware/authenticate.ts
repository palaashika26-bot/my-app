import { Request, Response, NextFunction } from "express";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import config from "../config/env";
import { ApiError } from "../utils/ApiError";
import prisma from "../config/prisma";

interface JwtAccessPayload {
  userId: string;
  role: string;
}

interface AuthCacheEntry {
  isEmailVerified: boolean;
  isApproved: boolean;
  clientId: string | null;
  expiresAt: number;
}

const AUTH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const authCache = new Map<string, AuthCacheEntry>();

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

    // For CLIENT accounts, verify email + approval status and resolve their
    // clientId — cached for 5 min. clientId is required by client-scoped routes.
    let clientId: string | undefined;
    if (decoded.role === "CLIENT") {
      const now = Date.now();
      const cached = authCache.get(decoded.userId);

      let isEmailVerified: boolean;
      let isApproved: boolean;

      if (cached && cached.expiresAt > now) {
        isEmailVerified = cached.isEmailVerified;
        isApproved = cached.isApproved;
        clientId = cached.clientId ?? undefined;
      } else {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            isEmailVerified: true,
            isApproved: true,
            client: { select: { id: true } },
          },
        });
        if (!user) {
          return next(new ApiError(401, "Please verify your email first"));
        }
        isEmailVerified = user.isEmailVerified;
        isApproved = user.isApproved;
        clientId = user.client?.id ?? undefined;
        authCache.set(decoded.userId, {
          isEmailVerified,
          isApproved,
          clientId: user.client?.id ?? null,
          expiresAt: now + AUTH_CACHE_TTL_MS,
        });
      }

      if (!isEmailVerified) {
        return next(new ApiError(401, "Please verify your email first"));
      }
      if (!isApproved) {
        return next(new ApiError(401, "Your account is not yet active"));
      }
    }

    req.user = { userId: decoded.userId, role: decoded.role, clientId };
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
