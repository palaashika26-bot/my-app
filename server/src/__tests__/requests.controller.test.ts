process.env.JWT_SECRET = 'test-secret';
process.env.JWT_ACCESS_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

import { Request, Response } from 'express';
import * as requestsController from '../api/v1/requests/requests.controller';
import { requestsService } from '../api/v1/requests/requests.service';

jest.mock('../api/v1/requests/requests.service');

jest.mock('../config/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../config/prisma', () => ({
  default: {
    client: {
      findUnique: jest.fn().mockResolvedValue({ id: 'c1', user: { firstName: 'Test', lastName: 'User', email: 'test@test.com' } }),
    },
    product: {
      findUnique: jest.fn().mockResolvedValue({ id: 'p1', name: 'Test Product', isActive: true }),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

const mockService = requestsService as jest.Mocked<typeof requestsService>;

const mockRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('createRequest controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses clientId from req.user — not from req.body', async () => {
    const req = {
      user: { userId: 'u1', role: 'CLIENT', clientId: 'client-from-token' },
      body: {
        items: [{ type: 'CUSTOM', productName: 'Test', quantity: 10, unit: 'PCS' }],
        clientId: 'client-from-body-SHOULD-BE-IGNORED',
      },
    } as unknown as Request;
    const res = mockRes();
    mockService.createRequest.mockResolvedValue({ id: 'req-1' } as any);

    await requestsController.createRequest(req, res);

    expect(mockService.createRequest).toHaveBeenCalledWith(
      'client-from-token',
      expect.objectContaining({ items: expect.any(Array) })
    );
  });

  it('returns 201 on successful creation', async () => {
    const req = {
      user: { userId: 'u1', role: 'CLIENT', clientId: 'c1' },
      body: { items: [{ type: 'CUSTOM', productName: 'Test', quantity: 5, unit: 'PCS' }] },
    } as unknown as Request;
    const res = mockRes();
    mockService.createRequest.mockResolvedValue({ id: 'req-1', status: 'SUBMITTED' } as any);

    await requestsController.createRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('throws 403 when req.user has no clientId', async () => {
    const req = { user: { userId: 'u1', role: 'CLIENT' }, body: {} } as unknown as Request;
    await expect(requestsController.createRequest(req, mockRes()))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('forwards requestType in body to service unchanged', async () => {
    const req = {
      user: { userId: 'u1', role: 'CLIENT', clientId: 'c1' },
      body: {
        requestType: 'QUOTATION',
        items: [{ type: 'CUSTOM', productName: 'Test', quantity: 1, unit: 'PCS' }],
      },
    } as unknown as Request;
    mockService.createRequest.mockResolvedValue({ id: 'req-2' } as any);

    await requestsController.createRequest(req, mockRes());

    expect(mockService.createRequest).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ requestType: 'QUOTATION' })
    );
  });
});

describe('getRequests controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes role and clientId from token to service', async () => {
    const req = { user: { role: 'CLIENT', userId: 'u1', clientId: 'c1' }, query: {} } as unknown as Request;
    const res = mockRes();
    mockService.getRequests.mockResolvedValue({ requests: [], pagination: {} } as any);

    await requestsController.getRequests(req, res);

    expect(mockService.getRequests).toHaveBeenCalledWith(
      expect.objectContaining({}),
      'u1',
      'CLIENT',
      'c1'
    );
  });

  it('passes ADMIN role with no clientId', async () => {
    const req = { user: { role: 'ADMIN', userId: 'admin1' }, query: {} } as unknown as Request;
    const res = mockRes();
    mockService.getRequests.mockResolvedValue({ requests: [], pagination: {} } as any);

    await requestsController.getRequests(req, res);

    expect(mockService.getRequests).toHaveBeenCalledWith(
      expect.objectContaining({}),
      'admin1',
      'ADMIN',
      undefined
    );
  });
});
