import prisma from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";

export const disputesRepository = {
  async create(data: {
    orderId: string;
    clientId: string;
    type: "REPLACEMENT" | "ISSUE";
    reason: string;
    videoProofUrl?: string;
    attachments?: string[];
  }) {
    return prisma.dispute.create({ data: data as any });
  },

  async findAll(status?: string, orderId?: string) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (orderId) where.orderId = orderId;

    return prisma.dispute.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true,
            createdAt: true,
          },
        },
        client: {
          select: {
            companyName: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
  },

  async findById(id: string) {
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true,
            createdAt: true,
            clientId: true,
          },
        },
        client: {
          select: {
            id: true,
            companyName: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
    if (!dispute) throw ApiError.notFound(`Dispute "${id}" not found`);
    return dispute;
  },

  async updateStatus(id: string, data: { status: string; adminNote?: string }) {
    const dispute = await prisma.dispute.findUnique({ where: { id } });
    if (!dispute) throw ApiError.notFound(`Dispute "${id}" not found`);
    return prisma.dispute.update({
      where: { id },
      data: {
        status: data.status as any,
        adminNote: data.adminNote ?? dispute.adminNote,
      },
    });
  },

  async countOpen() {
    return prisma.dispute.count({ where: { status: "OPEN" } });
  },
};
