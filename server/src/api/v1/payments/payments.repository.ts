import prisma from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";

export const paymentsRepository = {
  async create(data: {
    orderId: string;
    type: "ADVANCE" | "BALANCE";
    amountINR: number;
    proofImageBase64: string;
    proofFileName?: string;
    notes?: string;
  }) {
    return prisma.payment.create({
      data: {
        orderId: data.orderId,
        type: data.type,
        amountINR: data.amountINR,
        status: "SUBMITTED",
        proofImageBase64: data.proofImageBase64,
        proofFileName: data.proofFileName,
        notes: data.notes,
        submittedAt: new Date(),
      },
    });
  },

  async findByOrderId(orderId: string) {
    return prisma.payment.findMany({
      where: { orderId },
      select: {
        id: true,
        orderId: true,
        type: true,
        amountINR: true,
        status: true,
        proofImageBase64: true,
        proofFileName: true,
        submittedAt: true,
        verifiedAt: true,
        rejectedAt: true,
        rejectionReason: true,
        notes: true,
        createdAt: true,
        verifiedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string) {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            client: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
        verifiedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
  },

  async verify(id: string, staffUserId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      select: { orderId: true, type: true },
    });
    if (!payment) throw ApiError.notFound("Payment not found");

    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: {
        status: "VERIFIED",
        verifiedAt: new Date(),
        verifiedByUserId: staffUserId,
      },
    });

    const newOrderStatus =
      payment.type === "ADVANCE" ? "ADVANCE_PAID" : "FULLY_PAID";

    await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: newOrderStatus },
    });

    return updatedPayment;
  },

  async reject(id: string, staffUserId: string, reason: string) {
    return prisma.payment.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectionReason: reason,
        verifiedByUserId: staffUserId,
      },
    });
  },

  // ── Request payment methods ─────────────────────────────────────────────────

  async createRequestPayment(data: {
    requestId: string;
    type: "ADVANCE" | "FULL";
    amountINR: number;
    proofImageBase64: string;
    proofFileName?: string;
    notes?: string;
  }) {
    return prisma.requestPayment.create({
      data: {
        requestId: data.requestId,
        type: data.type as any,
        amountINR: data.amountINR,
        status: "SUBMITTED",
        proofImageBase64: data.proofImageBase64,
        proofFileName: data.proofFileName,
        notes: data.notes,
        submittedAt: new Date(),
      },
    });
  },

  async findByRequestId(requestId: string) {
    return prisma.requestPayment.findMany({
      where: { requestId },
      select: {
        id: true,
        requestId: true,
        type: true,
        amountINR: true,
        status: true,
        proofImageBase64: true,
        proofFileName: true,
        submittedAt: true,
        verifiedAt: true,
        rejectedAt: true,
        rejectionReason: true,
        notes: true,
        createdAt: true,
        verifiedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async findRequestPaymentById(id: string) {
    return prisma.requestPayment.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            client: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
        verifiedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
  },

  async verifyRequestPayment(id: string, staffUserId: string) {
    return prisma.requestPayment.update({
      where: { id },
      data: {
        status: "VERIFIED",
        verifiedAt: new Date(),
        verifiedByUserId: staffUserId,
      },
    });
  },

  async rejectRequestPayment(id: string, staffUserId: string, reason: string) {
    return prisma.requestPayment.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectionReason: reason,
        verifiedByUserId: staffUserId,
      },
    });
  },
};
