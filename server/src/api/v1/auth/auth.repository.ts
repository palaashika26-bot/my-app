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

  async findPendingVerification(userId: string) {
    return prisma.emailVerification.findFirst({
      where: {
        userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  },
};
