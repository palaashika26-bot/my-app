import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import config from "../../../config/env";
import { authRepository } from "./auth.repository";
import { ApiError } from "../../../utils/ApiError";
import { RegisterInput } from "./auth.schema";

// ── Token helpers ─────────────────────────────────────────────────────────────

export function generateAccessToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

// ── Sanitize user — never return passwordHash ─────────────────────────────────

function sanitizeUser(user: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = user as { passwordHash: unknown; [key: string]: unknown };
  return safe;
}

// ── Auth service ──────────────────────────────────────────────────────────────

export const authService = {
  async login(email: string, password: string) {
    // 1. Find user
    const user = await authRepository.findUserByEmail(email);
    if (!user) throw new ApiError(401, "Invalid credentials");

    // 2. Check not soft-deleted / deactivated
    if (user.deletedAt) throw new ApiError(401, "Account deactivated");
    if (!user.isActive) throw new ApiError(401, "Account deactivated");

    // 3. Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new ApiError(401, "Invalid credentials");

    // 4. Generate tokens
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // 5. Persist refresh token (7 days from now)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await authRepository.saveRefreshToken(user.id, refreshToken, expiresAt);

    // 6. Return safe user + tokens
    return {
      user: sanitizeUser(user as unknown as Record<string, unknown>),
      accessToken,
      refreshToken,
    };
  },

  async register(data: RegisterInput) {
    // 1. Uniqueness check
    const existing = await authRepository.findUserByEmail(data.email);
    if (existing) throw new ApiError(409, "Email already registered");

    // 2. Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // 3. Create user
    const user = await authRepository.createUser({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
    });

    // 4. Create empty client profile linked to this user
    await authRepository.createClientForUser(
      user.id,
      `${data.firstName} ${data.lastName}`
    );

    return sanitizeUser(user as unknown as Record<string, unknown>);
  },

  async refreshAccessToken(token: string) {
    // 1. Lookup stored token
    const stored = await authRepository.findRefreshToken(token);
    if (!stored) throw new ApiError(401, "Invalid token");

    // 2. Revoked?
    if (stored.revokedAt) throw new ApiError(401, "Token revoked");

    // 3. Expired in DB?
    if (stored.expiresAt < new Date()) throw new ApiError(401, "Token expired");

    // 4. Cryptographic verification
    try {
      jwt.verify(token, config.JWT_REFRESH_SECRET);
    } catch {
      throw new ApiError(401, "Token invalid or expired");
    }

    // 5. Issue new access token
    const accessToken = generateAccessToken(stored.user.id, stored.user.role);
    return { accessToken };
  },

  async logout(token: string) {
    await authRepository.revokeRefreshToken(token);
  },

  async getCurrentUser(userId: string) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw ApiError.notFound("User not found");
    return user;
  },
};
