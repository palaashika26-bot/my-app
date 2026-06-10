import prisma from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";

export const paymentsRepository = {
  async create(data: {
    orderId: string;
    type: "ADVANCE" | "BALANCE";
    amountINR: number;
    proofUrl?: string;
    proofThumbUrl?: string;
    proofImageBase64?: string;
    proofFileName?: string;
    notes?: string;
  }) {
    return prisma.payment.create({
      data: {
        orderId: data.orderId,
        type: data.type,
        amountINR: data.amountINR,
        status: "SUBMITTED",
        proofUrl: data.proofUrl,
        proofThumbUrl: data.proofThumbUrl,
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
        proofUrl: true,
        proofThumbUrl: true,
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
    proofUrl?: string;
    proofThumbUrl?: string;
    proofImageBase64?: string;
    proofFileName?: string;
    notes?: string;
  }) {
    return prisma.requestPayment.create({
      data: {
        requestId: data.requestId,
        type: data.type as any,
        amountINR: data.amountINR,
        status: "SUBMITTED",
        proofUrl: data.proofUrl,
        proofThumbUrl: data.proofThumbUrl,
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
        proofUrl: true,
        proofThumbUrl: true,
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

  // ── Logistics payment methods ───────────────────────────────────────────────

  async createLogisticsPayment(data: {
    logisticsRequestId: string;
    type: "ADVANCE" | "FULL";
    amountINR: number;
    proofUrl?: string;
    proofThumbUrl?: string;
    proofImageBase64?: string;
    proofFileName?: string;
    notes?: string;
  }) {
    return prisma.logisticsPayment.create({
      data: {
        logisticsRequestId: data.logisticsRequestId,
        type: data.type as any,
        amountINR: data.amountINR,
        status: "SUBMITTED",
        proofUrl: data.proofUrl,
        proofThumbUrl: data.proofThumbUrl,
        proofImageBase64: data.proofImageBase64,
        proofFileName: data.proofFileName,
        notes: data.notes,
        submittedAt: new Date(),
      },
    });
  },

  async findByLogisticsId(logisticsRequestId: string) {
    return prisma.logisticsPayment.findMany({
      where: { logisticsRequestId },
      select: {
        id: true,
        logisticsRequestId: true,
        type: true,
        amountINR: true,
        status: true,
        proofUrl: true,
        proofThumbUrl: true,
        proofImageBase64: true,
        proofFileName: true,
        submittedAt: true,
        verifiedAt: true,
        rejectedAt: true,
        rejectionReason: true,
        notes: true,
        createdAt: true,
        verifiedBy: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async findLogisticsPaymentById(id: string) {
    return prisma.logisticsPayment.findUnique({
      where: { id },
      include: {
        logisticsRequest: {
          include: {
            client: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
        verifiedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });
  },

  // Verifying a logistics payment confirms the order and starts its fulfillment
  // timeline at the first phase (At Warehouse).
  async verifyLogisticsPayment(id: string, staffUserId: string) {
    const payment = await prisma.logisticsPayment.findUnique({
      where: { id },
      select: { logisticsRequestId: true },
    });
    if (!payment) throw ApiError.notFound("Payment not found");

    const updated = await prisma.logisticsPayment.update({
      where: { id },
      data: {
        status: "VERIFIED",
        verifiedAt: new Date(),
        verifiedByUserId: staffUserId,
      },
    });

    await prisma.logisticsRequest.update({
      where: { id: payment.logisticsRequestId },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        phase: "AT_WAREHOUSE",
        completedPhases: ["AT_WAREHOUSE"],
      },
    });

    return updated;
  },

  // Rejecting reverts the request to ACCEPTED so the client can resubmit proof.
  async rejectLogisticsPayment(id: string, staffUserId: string, reason: string) {
    const payment = await prisma.logisticsPayment.findUnique({
      where: { id },
      select: { logisticsRequestId: true },
    });

    const updated = await prisma.logisticsPayment.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectionReason: reason,
        verifiedByUserId: staffUserId,
      },
    });

    if (payment) {
      await prisma.logisticsRequest.update({
        where: { id: payment.logisticsRequestId },
        data: { status: "ACCEPTED" },
      });
    }

    return updated;
  },
};
