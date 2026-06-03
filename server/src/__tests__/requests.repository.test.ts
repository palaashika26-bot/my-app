process.env.JWT_SECRET = 'test-secret';
process.env.JWT_ACCESS_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';

import * as repo from '../api/v1/requests/requests.repository';
import prisma from '../config/prisma';

jest.mock('../utils/generateRequestNumber', () => ({
  generateRequestNumber: jest.fn().mockResolvedValue('REQ-001'),
}));

jest.mock('../config/prisma', () => ({
  __esModule: true,
  default: {
    sourcingRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('requests.repository.create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls prisma.sourcingRequest.create with requestNumber and clientId', async () => {
    const createData = {
      notes: 'Test notes',
      items: [{ type: 'CUSTOM', productName: 'Test Item', quantity: 10, unit: 'PCS' }],
    };

    (prisma.sourcingRequest.create as jest.Mock).mockResolvedValue({ id: 'r1', requestNumber: 'REQ-001' });

    await repo.requestsRepository.create('c1', createData);

    expect(prisma.sourcingRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: 'c1',
          requestNumber: 'REQ-001',
        }),
      })
    );
  });
});

describe('requests.repository.findAll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.sourcingRequest.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.sourcingRequest.count as jest.Mock).mockResolvedValue(0);
  });

  it('applies clientId filter for CLIENT role', async () => {
    await repo.requestsRepository.findAll({ clientId: 'c1', skip: 0, take: 10 });

    expect(prisma.sourcingRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: 'c1' }),
      })
    );
  });

  it('applies NO clientId filter for ADMIN role — returns all', async () => {
    await repo.requestsRepository.findAll({ skip: 0, take: 10 });

    const call = (prisma.sourcingRequest.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).not.toHaveProperty('clientId');
  });

  it('does NOT filter by requestType — returns SOURCING and QUOTATION together', async () => {
    await repo.requestsRepository.findAll({ skip: 0, take: 10 });

    const call = (prisma.sourcingRequest.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).not.toHaveProperty('requestType');
  });

  it('returns a tuple of [requests, total]', async () => {
    (prisma.sourcingRequest.findMany as jest.Mock).mockResolvedValue([{ id: 'r1' }]);
    (prisma.sourcingRequest.count as jest.Mock).mockResolvedValue(1);

    const result = await repo.requestsRepository.findAll({ skip: 0, take: 10 });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([{ id: 'r1' }]);
    expect(result[1]).toBe(1);
  });
});
