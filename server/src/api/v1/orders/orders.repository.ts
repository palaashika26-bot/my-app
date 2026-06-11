import prisma from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";
import { signImageFields } from "../../../config/storage";

// ── Timeline stage order — used by computeDisplayStatus ───────────────────────
const DISPLAY_STAGE_ORDER = [
  "Order Placed",
  "Payment Confirmed",
  "Sourcing",
  "At China Warehouse",
  "China Consolidation Warehouse",
  "Repacking Warehouse",
  "Shipped from China",
  "In Transit",
  "Arrived India Warehouse",
  "Out for Delivery",
  "Completed",
];

// ── DB enum → canonical display label ─────────────────────────────────────────
const DB_STATUS_TO_DISPLAY: Record<string, string> = {
  PAYMENT_PENDING: "Payment Pending",
  CONFIRMED:       "Payment Confirmed",
  ADVANCE_PAID:    "Payment Confirmed",
  FULLY_PAID:      "Payment Confirmed",
  SOURCING:        "Sourcing",
  QC_PENDING:      "At China Warehouse",
  QC_PASSED:       "Ready for Shipping",
  QC_FAILED:       "Exception",
  REPACKING:       "Repacking Warehouse",
  SHIPPED:         "Shipped from China",
  DELIVERED:       "Completed",
  CANCELLED:       "Exception",
};

/**
 * Compute the canonical display status string for an order.
 * When completedStages is non-empty the furthest stage in the timeline wins
 * (this disambiguates the four SHIPPED sub-stages). Exception statuses
 * (CANCELLED / QC_FAILED) always return "Exception" regardless of stages.
 */
export function computeDisplayStatus(
  dbStatus: string,
  completedStages: string[]
): string {
  if (dbStatus === "CANCELLED" || dbStatus === "QC_FAILED") return "Exception";
  const cs = completedStages ?? [];
  if (cs.length > 0) {
    let maxIdx = -1;
    for (let i = 0; i < DISPLAY_STAGE_ORDER.length; i++) {
      if (cs.includes(DISPLAY_STAGE_ORDER[i])) maxIdx = i;
    }
    if (maxIdx >= 0) return DISPLAY_STAGE_ORDER[maxIdx];
  }
  return DB_STATUS_TO_DISPLAY[dbStatus] ?? dbStatus;
}

interface OrderFilters {
  clientId?: string;
  /** DB OrderStatus enum values to match (controller maps display labels → enums). */
  statuses?: string[];
  /** Exact displayStatus value for sub-stage server-side filtering. */
  displayStatus?: string;
  /** Free-text match across order number, company name, and item names/notes. */
  search?: string;
  skip: number;
  take: number;
}

export const ordersRepository = {
  async findAll(filters: OrderFilters) {
    const { clientId, statuses, displayStatus, search, skip, take } = filters;

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (clientId) {
      where.clientId = clientId;
    }
    if (statuses && statuses.length) {
      where.status = { in: statuses };
    }
    if (displayStatus) {
      where.displayStatus = displayStatus;
    }
    const term = search?.trim();
    if (term) {
      where.OR = [
        { orderNumber: { contains: term, mode: "insensitive" } },
        { client: { companyName: { contains: term, mode: "insensitive" } } },
        {
          items: {
            some: {
              OR: [
                { notes: { contains: term, mode: "insensitive" } },
                { product: { name: { contains: term, mode: "insensitive" } } },
              ],
            },
          },
        },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take,
        // Trimmed to exactly what the list views render (admin all-orders,
        // client dashboard, client orders list). Heavy/unused-in-list fields
        // (gstInvoice JSON, product.images[] arrays, item.imageUrl, the money
        // breakdown, delivery address) are intentionally omitted — they're only
        // read by the [id] detail pages, which use findById. This is the main
        // payload-bloat fix for the slow admin orders panel.
        select: {
          id: true,
          orderNumber: true,
          status: true,
          completedStages: true,
          createdAt: true,
          totalINR: true,
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
              notes: true,
              product: { select: { name: true } },
            },
          },
          shipment: { select: { estimatedDelivery: true, deliveredAt: true, carrier: true, trackingNumber: true } },
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
              imageUrl: true,
              product: { select: { name: true, images: true } },
              qcCheck: true,
            },
          },
          shipment: { select: { estimatedDelivery: true, deliveredAt: true, carrier: true, trackingNumber: true } },
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
              proofUrl: true,
              proofThumbUrl: true,
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

    const requestPayments = sourcingRequest?.payments ?? [];
    // Convert object-storage paths (order item images copied from request
    // reference images; request-payment proofs) to short-lived signed read URLs.
    await signImageFields(order.items, { singles: ["imageUrl"] });
    await signImageFields(requestPayments, { singles: ["proofUrl", "proofThumbUrl"] });
    return { ...order, requestPayments };
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
    const order = await prisma.order.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true } });
    if (!order) throw ApiError.notFound(`Order "${id}" not found`);
    const displayStatus = computeDisplayStatus(order.status, completedStages);
    return prisma.order.update({ where: { id }, data: { completedStages, displayStatus } });
  },

  async updateStatus(id: string, status: string) {
    const order = await prisma.order.findFirst({ where: { id, deletedAt: null }, select: { id: true, completedStages: true } });
    if (!order) throw ApiError.notFound(`Order "${id}" not found`);
    const displayStatus = computeDisplayStatus(status, order.completedStages);
    return prisma.order.update({ where: { id }, data: { status: status as any, displayStatus } });
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
