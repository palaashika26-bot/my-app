import prisma from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";

interface OrderFilters {
  clientId?: string;
  skip: number;
  take: number;
}

export const ordersRepository = {
  async findAll(filters: OrderFilters) {
    const { clientId, skip, take } = filters;

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (clientId) {
      where.clientId = clientId;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          completedStages: true,
          createdAt: true,
          totalINR: true,
          subtotalINR: true,
          shippingCostINR: true,
          taxINR: true,
          advanceAmountINR: true,
          deliveryPreference: true,
          deliveryAddress: true,
          gstInvoice: true,
          clientId: true,
          client: {
            select: {
              companyName: true,
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
          items: {
            select: {
              id: true,
              quantity: true,
              unitPriceCNY: true,
              unitPriceINR: true,
              totalINR: true,
              notes: true,
              product: { select: { name: true } },
            },
          },
          shipment: { select: { estimatedDelivery: true, carrier: true, trackingNumber: true } },
          warehouseReport: {
            select: {
              isReadByAdmin: true,
              isReadByStaff: true,
              lastUpdatedAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count({ where }),
    ]);

    return [orders, total] as const;
  },

  async findById(id: string, clientId?: string) {
    const where: Record<string, unknown> = { id, deletedAt: null };

    if (clientId) {
      where.clientId = clientId;
    }

    const [order, sourcingRequest] = await Promise.all([
      prisma.order.findFirst({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          completedStages: true,
          createdAt: true,
          totalINR: true,
          subtotalINR: true,
          shippingCostINR: true,
          taxINR: true,
          advanceAmountINR: true,
          deliveryPreference: true,
          deliveryAddress: true,
          gstInvoice: true,
          clientId: true,
          client: {
            select: {
              companyName: true,
              user: { select: { firstName: true, lastName: true, email: true, phone: true } },
            },
          },
          items: {
            select: {
              id: true,
              quantity: true,
              unitPriceCNY: true,
              unitPriceINR: true,
              totalINR: true,
              notes: true,
              product: { select: { name: true } },
              qcCheck: true,
            },
          },
          shipment: { select: { estimatedDelivery: true, carrier: true, trackingNumber: true } },
        },
      }),
      prisma.sourcingRequest.findFirst({
        where: { convertedOrderId: id },
        select: {
          id: true,
          payments: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              requestId: true,
              type: true,
              amountINR: true,
              status: true,
              proofImageBase64: true,
              submittedAt: true,
              verifiedAt: true,
              rejectedAt: true,
              rejectionReason: true,
              notes: true,
            },
          },
        },
      }),
    ]);

    if (!order) {
      throw ApiError.notFound(`Order with id "${id}" not found`);
    }

    return {
      ...order,
      requestPayments: sourcingRequest?.payments ?? [],
    };
  },

  async getGSTInvoice(id: string) {
    const order = await prisma.order.findFirst({
      where: { id, deletedAt: null },
      select: { gstInvoice: true },
    });
    if (!order) throw ApiError.notFound(`Order "${id}" not found`);
    return order.gstInvoice ?? null;
  },

  async saveGSTInvoice(id: string, gstInvoice: Record<string, unknown>) {
    const order = await prisma.order.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!order) throw ApiError.notFound(`Order "${id}" not found`);
    return prisma.order.update({ where: { id }, data: { gstInvoice: gstInvoice as any } });
  },

  async updateCompletedStages(id: string, completedStages: string[]) {
    const order = await prisma.order.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!order) throw ApiError.notFound(`Order "${id}" not found`);
    return prisma.order.update({ where: { id }, data: { completedStages } });
  },

  async updateStatus(id: string, status: string) {
    const order = await prisma.order.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!order) throw ApiError.notFound(`Order "${id}" not found`);
    return prisma.order.update({ where: { id }, data: { status: status as any } });
  },

  async updateDeliveryPreference(id: string, deliveryPreference: string, deliveryAddress?: string) {
    const order = await prisma.order.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!order) throw ApiError.notFound(`Order "${id}" not found`);
    return prisma.order.update({ where: { id }, data: { deliveryPreference, deliveryAddress: deliveryAddress ?? null } });
  },

  async getWarehouseReport(orderId: string, clientId?: string) {
    // Lightweight ownership check — no heavy includes, no base64 fields
    const where: Record<string, unknown> = { id: orderId, deletedAt: null };
    if (clientId) where.clientId = clientId;
    const order = await prisma.order.findFirst({ where, select: { id: true } });
    if (!order) {
      throw clientId
        ? ApiError.forbidden("You do not have access to this order")
        : ApiError.notFound(`Order "${orderId}" not found`);
    }
    const report = await prisma.warehouseReport.findUnique({ where: { orderId } });
    return report ?? null;
  },

  async upsertWarehouseReport(orderId: string, data: Record<string, unknown>) {
    const order = await prisma.order.findFirst({ where: { id: orderId, deletedAt: null }, select: { id: true } });
    if (!order) throw ApiError.notFound(`Order "${orderId}" not found`);
    return prisma.warehouseReport.upsert({
      where: { orderId },
      create: { orderId, ...data } as any,
      update: data as any,
    });
  },

  async appendAdminReply(orderId: string, reply: Record<string, unknown>) {
    // Ensure the report row exists first
    await prisma.warehouseReport.upsert({
      where: { orderId },
      create: { orderId } as any,
      update: {},
    });
    const report = await prisma.warehouseReport.findUnique({ where: { orderId } });
    const existing: unknown[] = Array.isArray(report?.adminReplies) ? (report!.adminReplies as unknown[]) : [];
    const updated = [...existing, reply];
    return prisma.warehouseReport.update({
      where: { orderId },
      data: { adminReplies: updated as any },
    });
  },
};
