import { Request, Response, NextFunction } from 'express';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.NODE_ENV = 'test';

import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { generateAccessToken } from '../api/v1/auth/auth.service';
import prismaMock from '../config/prisma';

jest.mock('../config/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

const mockNext: NextFunction = jest.fn();
const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

describe('authenticate middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls next() for a valid access token (non-CLIENT role)', async () => {
    const token = generateAccessToken('u1', 'STAFF');
    const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
    await authenticate(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
    expect((req as any).user.userId).toBe('u1');
    expect((req as any).user.role).toBe('STAFF');
  });

  it('calls next() for a valid CLIENT token with verified + approved user', async () => {
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
      isEmailVerified: true,
      isApproved: true,
      client: { id: 'client-1' },
    });

    const token = generateAccessToken('u1', 'CLIENT');
    const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
    await authenticate(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
    expect((req as any).user.userId).toBe('u1');
    expect((req as any).user.clientId).toBe('client-1');
  });

  it('returns 401 for missing Authorization header', async () => {
    const req = { headers: {} } as Request;
    await authenticate(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('returns 401 for a tampered token', async () => {
    const req = { headers: { authorization: 'Bearer tampered.token.here' } } as unknown as Request;
    await authenticate(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('returns 401 for CLIENT with unverified email', async () => {
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
      isEmailVerified: false,
      isApproved: true,
      client: { id: 'client-1' },
    });

    const token = generateAccessToken('u1', 'CLIENT');
    const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
    await authenticate(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});

describe('authorize middleware', () => {
  const mockResForAuth = {} as Response;

  it('calls next() when user role is in the allowed list', () => {
    const next = jest.fn();
    const req = { user: { role: 'CLIENT' } } as unknown as Request;
    const middleware = authorize(['CLIENT', 'ADMIN']);
    middleware(req, mockResForAuth, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('throws 403 when user role is not in the allowed list', () => {
    const next = jest.fn();
    const req = { user: { role: 'CLIENT' } } as unknown as Request;
    const middleware = authorize(['ADMIN']);
    expect(() => middleware(req, mockResForAuth, next)).toThrow(
      expect.objectContaining({ statusCode: 403 })
    );
  });

  it('throws 401 when req.user is undefined', () => {
    const next = jest.fn();
    const req = {} as Request;
    const middleware = authorize(['ADMIN']);
    expect(() => middleware(req, mockResForAuth, next)).toThrow(
      expect.objectContaining({ statusCode: 401 })
    );
  });

  it('uses Array.includes — does not false-positive on partial string match', () => {
    const next = jest.fn();
    const req = { user: { role: 'STAFF' } } as unknown as Request;
    const middleware = authorize(['STAFFADMIN']);
    expect(() => middleware(req, mockResForAuth, next)).toThrow(
      expect.objectContaining({ statusCode: 403 })
    );
  });
});
