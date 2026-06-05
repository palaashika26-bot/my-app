import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import config from "../../../config/env";
import { authRepository } from "./auth.repository";
import { ApiError } from "../../../utils/ApiError";
import { RegisterInput, RegisterClientInput } from "./auth.schema";
import { sendEmail } from "../../../config/email";
import { verificationEmailTemplate } from "../../../templates/verificationEmail";

// ── Token helpers ─────────────────────────────────────────────────────────────

export function generateAccessToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function generateRefreshToken(userId: string): string {
  // Include a random `jti` to ensure each refresh token is unique even when
  // generated in rapid succession (prevents DB unique-constraint collisions).
  const jti = crypto.randomBytes(16).toString("hex");
  return jwt.sign({ userId, jti }, config.JWT_REFRESH_SECRET, {
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

    // 4. Block unverified client accounts before issuing tokens
    if (user.role === "CLIENT" && !user.isEmailVerified) {
      throw new ApiError(
        401,
        "Please check your email and click the verification link to activate your account."
      );
    }
    if (user.role === "CLIENT" && !user.isApproved) {
      throw new ApiError(401, "Your account is not yet active");
    }

    // 5. Generate tokens
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // 6. Persist refresh token (7 days from now)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await authRepository.saveRefreshToken(user.id, refreshToken, expiresAt);

    // 7. Return safe user + tokens
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

  async registerClient(data: RegisterClientInput) {
    // 1. Check for an existing account. A verified account blocks re-registration.
    //    A still-unverified account is stale (e.g. a previous attempt whose
    //    verification email never sent) — delete it so the email is freed up and
    //    registration can proceed fresh instead of being permanently stuck.
    const existing = await authRepository.findUserByEmail(data.email);
    if (existing) {
      if (existing.isEmailVerified) {
        throw new ApiError(409, "Email already registered");
      }
      await authRepository.deleteUserById(existing.id);
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // 3. Create user + client profile + verification token atomically
    //    (isEmailVerified=false, isApproved=false by DB default)
    const { user, token } = await authRepository.createUnverifiedClient(
      {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      },
      {
        companyName: data.companyName,
        gstin: data.gstin || null,
        addressLine1: data.addressLine1 || null,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
      }
    );

    // 4. Build verification URL
    const verifyUrl = `${config.FRONTEND_URL}/verify-email?token=${token}`;

    // 5. Log URL in development for easy testing without real email
    if (config.NODE_ENV === "development") {
      console.log("\n✉  VERIFICATION URL:", verifyUrl, "\n");
    }

    // 6. Send verification email. If it cannot be delivered, roll the new
    //    account back so the email address is freed up for another attempt.
    const sent = await sendEmail({
      to: data.email,
      subject: "Verify your Elios account",
      html: verificationEmailTemplate(data.firstName, verifyUrl),
    });

    // In production a failed send rolls the new account back so the email is
    // freed for another attempt. In development we keep it — the verification
    // URL was logged above, so local testing works without a real SMTP server.
    if (!sent && config.NODE_ENV !== "development") {
      await authRepository.deleteUserById(user.id);
      throw new ApiError(
        502,
        "We couldn't send the verification email. Please check the address and try again."
      );
    }

    return {
      message:
        "Registration successful. Please check your email to verify your account.",
    };
  },

  async resendVerification(email: string) {
    // Always return the same message so this endpoint can't be used to probe
    // which emails have accounts.
    const genericMessage =
      "If an account for that email still needs verification, a new link has been sent.";

    const user = await authRepository.findUserByEmail(email);

    // Nothing to do for unknown or already-verified accounts.
    if (!user || user.isEmailVerified) {
      return { message: genericMessage };
    }

    // Invalidate any older links, then issue and send a fresh one.
    await authRepository.invalidateUserVerificationTokens(user.id);
    const token = await authRepository.createEmailVerificationToken(user.id);

    const verifyUrl = `${config.FRONTEND_URL}/verify-email?token=${token}`;
    if (config.NODE_ENV === "development") {
      console.log("\n✉  RESEND VERIFICATION URL:", verifyUrl, "\n");
    }

    const sent = await sendEmail({
      to: user.email,
      subject: "Verify your Elios account",
      html: verificationEmailTemplate(user.firstName, verifyUrl),
    });

    if (!sent && config.NODE_ENV !== "development") {
      throw new ApiError(
        502,
        "We couldn't send the verification email. Please try again in a few minutes."
      );
    }

    return { message: genericMessage };
  },

  async verifyEmail(token: string) {
    // 1. Find token record
    const record = await authRepository.findVerificationToken(token);

    // 2. Not found
    if (!record) throw new ApiError(400, "Invalid verification link");

    // 3. Already used
    if (record.usedAt) throw new ApiError(400, "This link has already been used");

    // 4. Expired
    if (record.expiresAt < new Date()) {
      throw new ApiError(
        400,
        "Verification link expired. Please register again."
      );
    }

    // 5. Mark token as used
    await authRepository.markTokenUsed(record.id);

    // 6. Mark user as verified and approved
    await authRepository.markEmailVerified(record.userId);

    return { message: "Email verified successfully. You can now login." };
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

    // 5. Issue new access token and rotate refresh token
    const accessToken = generateAccessToken(stored.user.id, stored.user.role);
    const newRefreshToken = generateRefreshToken(stored.user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Attempt atomic rotation (revoke old + create new) in a DB transaction
    try {
      await authRepository.rotateRefreshToken(token, stored.user.id, newRefreshToken, expiresAt);
    } catch (err) {
      // Fallback: try best-effort revoke + create; if that also fails, surface an error
      try {
        await authRepository.revokeRefreshToken(token);
        await authRepository.saveRefreshToken(stored.user.id, newRefreshToken, expiresAt);
      } catch (err2) {
        throw new ApiError(500, "Failed to rotate refresh token");
      }
    }

    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(token: string) {
    if (!token) return;
    // Find the token record so we can clear all sessions for this user
    const stored = await authRepository.findRefreshToken(token);
    if (stored && stored.user && stored.user.id) {
      await authRepository.deleteAllUserRefreshTokens(stored.user.id);
    } else {
      // Fallback: revoke the single token
      await authRepository.revokeRefreshToken(token);
    }
  },

  async getCurrentUser(userId: string) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw ApiError.notFound("User not found");
    return user;
  },

  async acceptInvite(token: string, password: string) {
    const { adminRepository } = await import("../admin/admin.repository");
    const user = await adminRepository.findUserByInviteToken(token);
    if (!user) throw new ApiError(400, "Invalid or expired invite link");

    const passwordHash = await bcrypt.hash(password, 12);
    await adminRepository.activateStaffAccount(user.id, passwordHash);

    return { message: "Account activated. You can now log in." };
  },
};
