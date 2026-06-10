import prisma from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";
import type {
  CreateLogisticsInput,
  QuoteLogisticsInput,
  RespondLogisticsInput,
  RespondCounterLogisticsInput,
  UpdatePhaseInput,
  DeliveryModeInput,
} from "./logistics.schema";

// Per-year sequential reference, mirrors generateRequestNumber (BK-REQ-...).
async function generateLogisticsNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.logisticsRequest.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });
  const seq = String(count + 1).padStart(4, "0");
  return `BK-LOG-${year}-${seq}`;
}

const paymentSelect = {
  id: true,
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
} as const;

interface ListFilters {
  clientId?: string;
  status?: string;
  confirmedOnly?: boolean;
  skip: number;
  take: number;
}

export const logisticsRepository = {
  async create(clientId: string, data: CreateLogisticsInput) {
    const requestNumber = await generateLogisticsNumber();
    return prisma.logisticsRequest.create({
      data: {
        requestNumber,
        clientId,
        shippingMethod: data.shippingMethod,
        weightKg: data.weightKg ?? null,
        volumeCbm: data.volumeCbm ?? null,
        packagingListUrls: data.packagingListUrls ?? [],
        packagingThumbUrls: data.packagingThumbUrls ?? [],
        note: data.note ?? null,
      },
    });
  },

  // Orphan-safe: select client scalars (incl. userId) without nesting the
  // required `user` relation, then stitch users in separately so a client whose
  // User was deleted yields user: null instead of 500ing the whole findMany.
  // Same pattern as requestsRepository.findAll.
  async findAll(filters: ListFilters) {
    const where: Record<string, unknown> = {};
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.status) where.status = filters.status;
    // "Confirmed orders" view = anything that has passed payment verification.
    if (filters.confirmedOnly) where.status = "CONFIRMED";

    const [rows, total] = await Promise.all([
      prisma.logisticsRequest.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        include: { client: { select: { id: true, companyName: true, userId: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.logisticsRequest.count({ where }),
    ]);

    const userIds = [
      ...new Set(
        rows.map((r) => r.client?.userId).filter((id): id is string => Boolean(id))
      ),
    ];
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));

    const withUser = rows.map((r) => ({
      ...r,
      client: r.client ? { ...r.client, user: byId.get(r.client.userId) ?? null } : null,
    }));

    return [withUser, total] as const;
  },

  async findById(id: string, clientId?: string) {
    const where: Record<string, unknown> = { id };
    if (clientId) where.clientId = clientId;

    const row = await prisma.logisticsRequest.findFirst({
      where,
      include: {
        client: true, // scalars incl. userId; user stitched below (orphan-safe)
        payments: { select: paymentSelect, orderBy: { createdAt: "desc" } },
      },
    });
    if (!row) throw ApiError.notFound("Logistics request not found");

    const clientUser = row.client
      ? await prisma.user.findUnique({
          where: { id: row.client.userId },
          select: { firstName: true, lastName: true, email: true, phone: true },
        })
      : null;

    return { ...row, client: row.client ? { ...row.client, user: clientUser } : null };
  },

  // Lightweight ownership/status lookup without the heavy includes.
  async findBasic(id: string) {
    return prisma.logisticsRequest.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, userId: true, companyName: true } },
      },
    });
  },

  async quote(id: string, data: QuoteLogisticsInput) {
    return prisma.logisticsRequest.update({
      where: { id },
      data: {
        status: "QUOTED",
        carrier: data.carrier,
        shippingMode: data.shippingMode,
        estimatedPriceINR: data.estimatedPriceINR,
        pricePerKgCNY: data.pricePerKgCNY ?? null,
        eta: data.eta ?? null,
        quoteNote: data.quoteNote ?? null,
        quotedAt: new Date(),
        // (re)quoting clears any prior counter / rejection
        counterPriceINR: null,
        counterNote: null,
        counteredAt: null,
        rejectedAt: null,
      },
    });
  },

  async respond(id: string, data: RespondLogisticsInput) {
    if (data.response === "ACCEPTED") {
      return prisma.logisticsRequest.update({
        where: { id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      });
    }
    if (data.response === "REJECTED") {
      return prisma.logisticsRequest.update({
        where: { id },
        data: { status: "REJECTED", rejectedAt: new Date() },
      });
    }
    return prisma.logisticsRequest.update({
      where: { id },
      data: {
        status: "COUNTERED",
        counterPriceINR: data.counterPriceINR ?? null,
        counterNote: data.counterNote ?? null,
        counteredAt: new Date(),
      },
    });
  },

  async respondCounter(id: string, data: RespondCounterLogisticsInput) {
    return prisma.logisticsRequest.update({
      where: { id },
      data: {
        status: "QUOTED",
        estimatedPriceINR: data.estimatedPriceINR,
        pricePerKgCNY: data.pricePerKgCNY ?? undefined,
        carrier: data.carrier ?? undefined,
        shippingMode: data.shippingMode ?? undefined,
        eta: data.eta ?? undefined,
        quoteNote: data.quoteNote ?? undefined,
        quotedAt: new Date(),
        counterPriceINR: null,
        counterNote: null,
        counteredAt: null,
      },
    });
  },

  async updatePhase(id: string, phase: UpdatePhaseInput["phase"]) {
    const existing = await prisma.logisticsRequest.findUnique({
      where: { id },
      select: { completedPhases: true },
    });
    const completed = new Set(existing?.completedPhases ?? []);
    completed.add(phase);
    return prisma.logisticsRequest.update({
      where: { id },
      data: { phase, completedPhases: [...completed] },
    });
  },

  async setDeliveryMode(id: string, data: DeliveryModeInput) {
    return prisma.logisticsRequest.update({
      where: { id },
      data: {
        deliveryMode: data.deliveryMode,
        deliveryAddress: data.deliveryAddress?.trim() || null,
      },
    });
  },

  async uploadSlip(id: string, url: string, thumb?: string) {
    return prisma.logisticsRequest.update({
      where: { id },
      data: {
        warehouseSlipUrl: url,
        warehouseSlipThumbUrl: thumb ?? null,
        slipUploadedAt: new Date(),
      },
    });
  },

  async confirmCargo(id: string, confirmedBy: string) {
    return prisma.logisticsRequest.update({
      where: { id },
      data: { cargoConfirmedBy: confirmedBy, cargoConfirmedAt: new Date() },
    });
  },

  async cancel(id: string, reason?: string) {
    return prisma.logisticsRequest.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason ?? undefined },
    });
  },

  async createMessage(id: string, senderId: string, senderRole: string, text: string) {
    return prisma.logisticsMessage.create({
      data: { logisticsRequestId: id, senderId, senderRole, text },
    });
  },

  async getMessages(id: string, since?: string) {
    const where: Record<string, unknown> = { logisticsRequestId: id };
    if (since) {
      const ts = /^\d+$/.test(since) ? new Date(Number(since)) : new Date(since);
      if (!Number.isNaN(ts.getTime())) where.createdAt = { gt: ts };
    }
    return prisma.logisticsMessage.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 100,
    });
  },
};
