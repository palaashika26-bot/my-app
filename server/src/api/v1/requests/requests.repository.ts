import prisma from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";
import { generateRequestNumber } from "../../../utils/generateRequestNumber";

const RMB_TO_INR = 11.5;

const itemInclude = {
  product: {
    select: { id: true, name: true, slug: true, images: true },
  },
};

const fullInclude = {
  client: {
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true, phone: true },
      },
    },
  },
  items: { include: itemInclude },
  activities: {
    include: {
      user: { select: { firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "desc" as const },
  },
};

interface RequestFilters {
  clientId?: string;
  status?: string;
  search?: string;
  skip: number;
  take: number;
}

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.order.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });
  const seq = String(count + 1).padStart(3, "0");
  return `EL-${year}-${seq}`;
}

export const requestsRepository = {
  async create(
    clientId: string,
    data: {
      notes?: string;
      totalBudgetINR?: number;
      items: {
        type: string;
        productId?: string;
        productName: string;
        productDescription?: string;
        quantity: number;
        unit: string;
        targetPriceINR?: number;
        notes?: string;
      }[];
    }
  ) {
    const requestNumber = await generateRequestNumber();
    return prisma.sourcingRequest.create({
      data: {
        requestNumber,
        clientId,
        notes: data.notes,
        totalBudgetINR: data.totalBudgetINR ?? null,
        items: {
          create: data.items.map((item) => ({
            type: item.type as "CATALOG" | "CUSTOM",
            productId: item.productId ?? null,
            productName: item.productName,
            productDescription: item.productDescription,
            quantity: item.quantity,
            unit: item.unit,
            targetPriceINR: item.targetPriceINR ?? null,
            notes: item.notes,
          })),
        },
      },
      include: fullInclude,
    });
  },

  async findAll(filters: RequestFilters) {
    const { clientId, status, skip, take } = filters;

    const where: Record<string, unknown> = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;

    const [requests, total] = await Promise.all([
      prisma.sourcingRequest.findMany({
        where,
        skip,
        take,
        include: {
          client: {
            include: {
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
          items: { select: { id: true, productName: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.sourcingRequest.count({ where }),
    ]);

    return [requests, total] as const;
  },

  async findById(id: string, clientId?: string) {
    const where: Record<string, unknown> = { id };
    if (clientId) where.clientId = clientId;

    const request = await prisma.sourcingRequest.findFirst({
      where,
      include: fullInclude,
    });

    if (!request) throw ApiError.notFound("Request not found");
    return request;
  },

  async sendQuotation(
    requestId: string,
    items: { id: string; quotedRMB: number }[],
    staffId: string,
    staffNotes?: string,
    advanceAmountINR?: number
  ) {
    return prisma.$transaction(async (tx) => {
      for (const item of items) {
        const quotedINR = parseFloat((item.quotedRMB * RMB_TO_INR).toFixed(2));
        await tx.requestItem.update({
          where: { id: item.id },
          data: {
            quotedRMB: item.quotedRMB,
            quotedINR,
            status: "QUOTED",
          },
        });
      }

      const updated = await tx.sourcingRequest.update({
        where: { id: requestId },
        data: {
          status: "QUOTED",
          quotedAt: new Date(),
          staffNotes: staffNotes ?? undefined,
          advanceAmountINR: advanceAmountINR ?? null,
        },
        include: fullInclude,
      });

      await tx.requestActivity.create({
        data: {
          requestId,
          userId: staffId,
          action: "Quotation sent to client",
        },
      });

      return updated;
    });
  },

  async approveRequest(requestId: string, staffId: string, isAutoConverted = false) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.sourcingRequest.findUnique({
        where: { id: requestId },
        include: {
          items: {
            include: {
              product: { include: { supplier: { select: { id: true } } } },
            },
          },
        },
      });

      if (!request) throw ApiError.notFound("Request not found");

      const orderNumber = await generateOrderNumber();

      // Exclude rejected/countered items — only include accepted or unresponded items
      const orderItems = request.items.filter(
        (item) => item.clientResponse !== "REJECTED" && item.clientResponse !== "COUNTERED"
      );

      // Calculate total from accepted/included items
      let totalINR = 0;
      for (const item of orderItems) {
        if (item.quotedINR) {
          totalINR += parseFloat(item.quotedINR.toString()) * item.quantity;
        }
      }

      const order = await tx.order.create({
        data: {
          orderNumber,
          clientId: request.clientId,
          status: "CONFIRMED",
          subtotalINR: totalINR,
          shippingCostINR: 0,
          taxINR: 0,
          totalINR,
          advanceAmountINR: request.advanceAmountINR ?? null,
          notes: `Converted from sourcing request ${request.requestNumber}`,
          items: {
            create: orderItems.map((item) => ({
              productId: item.productId ?? null,
              supplierId: item.product?.supplier?.id ?? null,
              quantity: item.quantity,
              unitPriceCNY: Number(item.quotedRMB) || 0,
              unitPriceINR: Number(item.quotedINR) || 0,
              totalINR: (Number(item.quotedINR) || 0) * item.quantity,
              notes: item.productName,
              imageUrl: item.referenceImageUrls?.[0] ?? null,
            })),
          },
        },
      });

      const updatedRequest = await tx.sourcingRequest.update({
        where: { id: requestId },
        data: {
          status: "CONVERTED",
          approvedAt: new Date(),
          convertedOrderId: order.id,
        },
        include: fullInclude,
      });

      await tx.requestActivity.create({
        data: {
          requestId,
          userId: staffId,
          action: isAutoConverted
            ? `Order ${orderNumber} auto-created — client accepted quotation`
            : `Request approved — order ${orderNumber} created`,
        },
      });

      return { request: updatedRequest, order };
    });
  },

  async rejectRequest(requestId: string, staffId: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.sourcingRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
          staffNotes: reason ?? undefined,
        },
        include: fullInclude,
      });

      await tx.requestActivity.create({
        data: {
          requestId,
          userId: staffId,
          action: reason ? `Request rejected: ${reason}` : "Request rejected",
        },
      });

      return updated;
    });
  },

  async cancelRequest(requestId: string, userId: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.sourcingRequest.update({
        where: { id: requestId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: reason ?? undefined,
        },
        include: fullInclude,
      });

      await tx.requestActivity.create({
        data: {
          requestId,
          userId,
          action: reason ? `Request cancelled: ${reason}` : "Request cancelled",
        },
      });

      return updated;
    });
  },

  async respondToQuotation(
    requestId: string,
    clientId: string,
    items: { id: string; response: string; counterPriceINR?: number; counterNote?: string }[]
  ) {
    return prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.requestItem.update({
          where: { id: item.id },
          data: {
            clientResponse: item.response,
            counterPriceINR: item.counterPriceINR ?? null,
            counterNote: item.counterNote ?? null,
            respondedAt: new Date(),
            status:
              item.response === "ACCEPTED"
                ? "ACCEPTED"
                : item.response === "REJECTED"
                ? "REJECTED"
                : "COUNTERED",
          },
        });
      }

      // Determine new request status
      const allItems = await tx.requestItem.findMany({
        where: { requestId },
        select: { clientResponse: true },
      });

      const responses = allItems.map((i) => i.clientResponse).filter(Boolean);
      const allResponded = responses.length === allItems.length;

      let newStatus = "QUOTED";
      if (allResponded) {
        const hasCountered = responses.some((r) => r === "COUNTERED");
        const hasAccepted = responses.some((r) => r === "ACCEPTED");
        const hasRejected = responses.some((r) => r === "REJECTED");
        if (hasCountered) {
          newStatus = "REVIEWING";
        } else if (hasAccepted && !hasRejected) {
          newStatus = "ACCEPTED";
        } else if (!hasAccepted && hasRejected) {
          newStatus = "REJECTED";
        } else if (hasAccepted && hasRejected) {
          newStatus = "PARTIALLY_ACCEPTED";
        }
      }

      const updated = await tx.sourcingRequest.update({
        where: { id: requestId },
        data: { status: newStatus as any },
        include: fullInclude,
      });

      await tx.requestActivity.create({
        data: {
          requestId,
          userId: clientId,
          action: `Client responded to quotation`,
        },
      });

      return updated;
    });
  },

  async respondToCounter(
    requestId: string,
    staffId: string,
    items: { id: string; newQuotedRMB: number }[]
  ) {
    return prisma.$transaction(async (tx) => {
      for (const item of items) {
        const quotedINR = parseFloat((item.newQuotedRMB * RMB_TO_INR).toFixed(2));
        await tx.requestItem.update({
          where: { id: item.id },
          data: {
            quotedRMB: item.newQuotedRMB,
            quotedINR,
            status: "QUOTED",
            clientResponse: null,
            counterPriceINR: null,
            counterNote: null,
            respondedAt: null,
          },
        });
      }

      const updated = await tx.sourcingRequest.update({
        where: { id: requestId },
        data: { status: "QUOTED" },
        include: fullInclude,
      });

      await tx.requestActivity.create({
        data: {
          requestId,
          userId: staffId,
          action: "Staff responded to client counter offer",
        },
      });

      return updated;
    });
  },

  async createWithReferenceData(
    clientId: string,
    data: {
      notes?: string;
      referenceNote?: string;
      requestType?: string;
      totalBudgetINR?: number;
      items: {
        type: string;
        productId?: string;
        productName: string;
        productDescription?: string;
        quantity: number;
        unit: string;
        targetPriceINR?: number;
        notes?: string;
        referenceImageUrls?: string[];
      }[];
    }
  ) {
    const requestNumber = await generateRequestNumber();
    return prisma.sourcingRequest.create({
      data: {
        requestNumber,
        clientId,
        notes: data.notes,
        referenceNote: data.referenceNote ?? null,
        totalBudgetINR: data.totalBudgetINR ?? null,
        items: {
          create: data.items.map((item) => ({
            type: item.type as "CATALOG" | "CUSTOM",
            productId: item.productId ?? null,
            productName: item.productName,
            productDescription: item.productDescription,
            quantity: item.quantity,
            unit: item.unit,
            targetPriceINR: item.targetPriceINR ?? null,
            notes: item.notes,
            referenceImageUrls: item.referenceImageUrls ?? [],
          })),
        },
      },
      include: fullInclude,
    });
  },

  async createMessage(requestId: string, senderId: string, senderRole: string, text: string) {
    return prisma.requestMessage.create({
      data: { requestId, senderId, senderRole, text },
    });
  },

  async getMessages(requestId: string, since?: string) {
    const where: Record<string, unknown> = { requestId };
    if (since) {
      // `since` may arrive as epoch millis ("1780743849774") or an ISO string.
      // new Date("1780743849774") yields an Invalid Date (NaN), which makes
      // Prisma throw and the whole poll 500s — so parse both shapes and skip
      // the filter entirely if the value is unparseable.
      const ts = /^\d+$/.test(since) ? new Date(Number(since)) : new Date(since);
      if (!Number.isNaN(ts.getTime())) {
        where.createdAt = { gt: ts };
      }
    }
    return prisma.requestMessage.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 100,
    });
  },
};
