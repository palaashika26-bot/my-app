process.env.JWT_SECRET = 'test-secret';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { authService, generateAccessToken, generateRefreshToken } from '../api/v1/auth/auth.service';
import { authRepository } from '../api/v1/auth/auth.repository';

jest.mock('../config/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../templates/verificationEmail', () => ({
  verificationEmailTemplate: jest.fn().mockReturnValue(''),
}));

jest.mock('../api/v1/auth/auth.repository');
const mockRepo = authRepository as jest.Mocked<typeof authRepository>;

const MOCK_USER = {
  id: 'user-1',
  email: 'client@test.com',
  passwordHash: bcrypt.hashSync('password123', 10),
  role: 'CLIENT',
  isEmailVerified: true,
  isApproved: true,
  isActive: true,
  deletedAt: null,
  client: { id: 'client-1' },
};

const newTokenExpiry = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

describe('AuthService', () => {
  describe('generateAccessToken', () => {
    it('returns a JWT containing userId and role', () => {
      const token = generateAccessToken('user-1', 'CLIENT');
      const decoded = jwt.decode(token) as Record<string, unknown>;
      expect(decoded.userId).toBe('user-1');
      expect(decoded.role).toBe('CLIENT');
    });

    it('access token and refresh token are different strings', () => {
      const access = generateAccessToken('user-1', 'CLIENT');
      const refresh = generateRefreshToken('user-1');
      expect(access).not.toBe(refresh);
    });
  });

  describe('login', () => {
    beforeEach(() => {
      mockRepo.findUserByEmail.mockResolvedValue(MOCK_USER as any);
      mockRepo.saveRefreshToken.mockResolvedValue(undefined as any);
    });

    it('returns user, accessToken and refreshToken for valid credentials', async () => {
      const result = await authService.login('client@test.com', 'password123');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(typeof result.accessToken).toBe('string');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('throws 401 for wrong password', async () => {
      await expect(authService.login('client@test.com', 'wrongpass'))
        .rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 for non-existent email', async () => {
      mockRepo.findUserByEmail.mockResolvedValue(null);
      await expect(authService.login('nobody@test.com', 'any'))
        .rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 if account is not active', async () => {
      mockRepo.findUserByEmail.mockResolvedValue({ ...MOCK_USER, isActive: false } as any);
      await expect(authService.login('client@test.com', 'password123'))
        .rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 if account is deleted', async () => {
      mockRepo.findUserByEmail.mockResolvedValue({ ...MOCK_USER, deletedAt: new Date() } as any);
      await expect(authService.login('client@test.com', 'password123'))
        .rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 if email not verified for CLIENT role', async () => {
      mockRepo.findUserByEmail.mockResolvedValue({ ...MOCK_USER, isEmailVerified: false } as any);
      await expect(authService.login('client@test.com', 'password123'))
        .rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 if not approved for CLIENT role', async () => {
      mockRepo.findUserByEmail.mockResolvedValue({ ...MOCK_USER, isApproved: false } as any);
      await expect(authService.login('client@test.com', 'password123'))
        .rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('refreshAccessToken', () => {
    const oldToken = generateRefreshToken('user-1');

    beforeEach(() => {
      mockRepo.findRefreshToken.mockResolvedValue({
        id: 'rt-1',
        token: oldToken,
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 99999),
        revokedAt: null,
        user: { id: 'user-1', role: 'CLIENT' },
      } as any);
      mockRepo.findUserById.mockResolvedValue(MOCK_USER as any);
      mockRepo.rotateRefreshToken.mockResolvedValue(undefined as any);
      mockRepo.revokeRefreshToken.mockResolvedValue(undefined as any);
      mockRepo.saveRefreshToken.mockResolvedValue(undefined as any);
    });

    it('returns a new accessToken and a new refreshToken', async () => {
      const result = await authService.refreshAccessToken(oldToken);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('calls rotateRefreshToken for the old token (rotation)', async () => {
      await authService.refreshAccessToken(oldToken);
      expect(mockRepo.rotateRefreshToken).toHaveBeenCalledWith(
        oldToken,
        'user-1',
        expect.any(String),
        expect.any(Date)
      );
    });

    it('throws 401 for an unknown token', async () => {
      mockRepo.findRefreshToken.mockResolvedValue(null);
      await expect(authService.refreshAccessToken('stale-token'))
        .rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 for a revoked token', async () => {
      mockRepo.findRefreshToken.mockResolvedValue({
        id: 'rt-1', token: oldToken, userId: 'user-1',
        expiresAt: new Date(Date.now() + 99999),
        revokedAt: new Date(),
        user: { id: 'user-1', role: 'CLIENT' },
      } as any);
      await expect(authService.refreshAccessToken(oldToken))
        .rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 for an expired token', async () => {
      mockRepo.findRefreshToken.mockResolvedValue({
        id: 'rt-1', token: oldToken, userId: 'user-1',
        expiresAt: new Date(Date.now() - 1000),
        revokedAt: null,
        user: { id: 'user-1', role: 'CLIENT' },
      } as any);
      await expect(authService.refreshAccessToken(oldToken))
        .rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('logout', () => {
    it('calls deleteAllUserRefreshTokens for the token owner', async () => {
      mockRepo.findRefreshToken.mockResolvedValue({
        id: 'rt-1', token: 'some-token', userId: 'user-1',
        expiresAt: new Date(Date.now() + 99999),
        revokedAt: null,
        user: { id: 'user-1', role: 'CLIENT' },
      } as any);
      mockRepo.deleteAllUserRefreshTokens.mockResolvedValue({ count: 3 } as any);

      await authService.logout('some-token');
      expect(mockRepo.deleteAllUserRefreshTokens).toHaveBeenCalledWith('user-1');
    });

    it('does nothing when token is empty', async () => {
      mockRepo.findRefreshToken = jest.fn();
      await authService.logout('');
      expect(mockRepo.findRefreshToken).not.toHaveBeenCalled();
    });

    it('calls revokeRefreshToken when token is valid but user is not found', async () => {
      mockRepo.findRefreshToken.mockResolvedValue({
        id: 'rt-1', token: 'orphan-token', userId: 'user-1',
        expiresAt: new Date(Date.now() + 99999),
        revokedAt: null,
        user: null,
      } as any);
      mockRepo.revokeRefreshToken.mockResolvedValue(undefined as any);

      await authService.logout('orphan-token');
      expect(mockRepo.revokeRefreshToken).toHaveBeenCalledWith('orphan-token');
    });
  });
});
