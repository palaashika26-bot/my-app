import crypto from "crypto";
import prisma from "../../../config/prisma";
import { Role } from "@prisma/client";

interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: Role;
}

interface CreateGoogleUserData {
  email: string;
  firstName: string;
  lastName: string;
}

interface CreateClientData {
  companyName: string;
  gstin?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

export const authRepository = {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { client: true },
    });
  },

  async findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        staffRole: true,
        isActive: true,
        isEmailVerified: true,
        isApproved: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        client: true,
      },
    });
  },

  async createUser(data: CreateUserData) {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role ?? Role.CLIENT,
      },
    });
  },

  async createGoogleUser(data: CreateGoogleUserData) {
    // Create a pre-verified user with no password set (Google users cannot
    // authenticate via email/password). An empty hash means any password-based
    // login attempt for this email will fail.
    const placeholderHash = await import("bcryptjs").then((b) =>
      b.default.hash(crypto.randomBytes(32).toString("hex"), 10)
    );
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: placeholderHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: Role.CLIENT,
        isEmailVerified: true,
        isApproved: true,
      },
    });
  },

  async createClientForUser(userId: string, companyName: string) {
    return prisma.client.create({
      data: { userId, companyName },
    });
  },

  async createClientProfile(userId: string, data: CreateClientData) {
    return prisma.client.create({
      data: {
        userId,
        companyName: data.companyName,
        gstin: data.gstin || null,
        addressLine1: data.addressLine1 || null,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
      },
    });
  },

  async saveRefreshToken(userId: string, token: string, expiresAt: Date) {
    return prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  },

  async findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
  },

  async rotateRefreshToken(oldToken: string, userId: string, newToken: string, expiresAt: Date) {
    // Revoke the old token and create the new token in a single DB transaction
    // to prevent race conditions that can lead to unique-constraint failures.
    return prisma.$transaction([
      prisma.refreshToken.update({
        where: { token: oldToken },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: { userId, token: newToken, expiresAt },
      }),
    ]);
  },

  async revokeRefreshToken(token: string) {
    return prisma.refreshToken.update({
      where: { token },
      data: { revokedAt: new Date() },
    });
  },

  async deleteAllUserRefreshTokens(userId: string) {
    return prisma.refreshToken.deleteMany({ where: { userId } });
  },

  // ── Email verification ────────────────────────────────────────────────────────

  async createEmailVerificationToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await prisma.emailVerification.create({
      data: { userId, token, expiresAt },
    });
    return token;
  },

  async findVerificationToken(token: string) {
    return prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });
  },

  async markTokenUsed(id: string) {
    return prisma.emailVerification.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  },

  async markEmailVerified(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        isApproved: true,
      },
    });
  },

  // Create the user, their client profile and a verification token atomically.
  // If any step fails the whole transaction rolls back, so a half-registered
  // email is never left behind to block a later retry.
  async createUnverifiedClient(user: CreateUserData, client: CreateClientData) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const createdUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: user.email,
          passwordHash: user.passwordHash,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role ?? Role.CLIENT,
        },
      });
      await tx.client.create({
        data: {
          userId: u.id,
          companyName: client.companyName,
          gstin: client.gstin || null,
          addressLine1: client.addressLine1 || null,
          city: client.city || null,
          state: client.state || null,
          pincode: client.pincode || null,
        },
      });
      await tx.emailVerification.create({
        data: { userId: u.id, token, expiresAt },
      });
      return u;
    });

    return { user: createdUser, token };
  },

  // Hard-delete a user and their dependent rows. Used to roll a registration
  // back when the verification email cannot be delivered. The Client relation
  // has no onDelete cascade, so it is removed explicitly before the user;
  // deleting the user then cascades emailVerifications and refreshTokens.
  async deleteUserById(userId: string) {
    return prisma.$transaction([
      prisma.client.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);
  },

  // Mark every still-valid verification token for a user as used, so issuing a
  // fresh link invalidates any older ones first.
  async invalidateUserVerificationTokens(userId: string) {
    return prisma.emailVerification.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  },

  async findPendingVerification(userId: string) {
    return prisma.emailVerification.findFirst({
      where: {
        userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  },

  // ── Password reset ────────────────────────────────────────────────────────────

  async createPasswordResetToken(email: string): Promise<string> {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await prisma.passwordReset.create({
      data: { email, token, expiresAt },
    });
    return token;
  },

  async findPasswordResetToken(token: string) {
    return prisma.passwordReset.findUnique({
      where: { token },
    });
  },

  async markPasswordResetTokenUsed(id: string) {
    return prisma.passwordReset.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  },

  // Set the user's new password and consume the reset token in a single
  // transaction, so a crash between the two writes can never leave one applied
  // without the other (e.g. token spent but password unchanged).
  async applyPasswordReset(email: string, passwordHash: string, tokenId: string) {
    return prisma.$transaction([
      prisma.user.update({ where: { email }, data: { passwordHash } }),
      prisma.passwordReset.update({ where: { id: tokenId }, data: { usedAt: new Date() } }),
    ]);
  },

  async updateUserPassword(email: string, passwordHash: string) {
    return prisma.user.update({
      where: { email },
      data: { passwordHash },
    });
  },

  async invalidatePasswordResetTokens(email: string) {
    return prisma.passwordReset.updateMany({
      where: { email, usedAt: null },
      data: { usedAt: new Date() },
    });
  },
};
