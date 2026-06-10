import prisma from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";
import { getPagination, buildPaginationMeta } from "../../../utils/pagination";
import { logisticsRepository } from "./logistics.repository";
import { sendEmail } from "../../../config/email";
import { notifyUser, notifyAdminsAndStaff } from "../../../utils/notify";
import { signImageFields } from "../../../config/storage";
import type {
  CreateLogisticsInput,
  QuoteLogisticsInput,
  RespondLogisticsInput,
  RespondCounterLogisticsInput,
  UpdatePhaseInput,
  DeliveryModeInput,
  UploadSlipInput,
  ConfirmCargoInput,
} from "./logistics.schema";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

interface ListQuery {
  page?: string;
  limit?: string;
  status?: string;
  view?: string;
}

// Sign storage-path image fields (packaging list, warehouse slip, payment proofs)
// in place so the client renders short-lived signed URLs. No-op for legacy/raw
// values and when storage is unconfigured.
async function signLogistics(row: any) {
  if (!row) return row;
  await signImageFields(row, {
    singles: ["warehouseSlipUrl", "warehouseSlipThumbUrl"],
    arrays: ["packagingListUrls", "packagingThumbUrls"],
  });
  if (Array.isArray(row.payments)) {
    await signImageFields(row.payments, { singles: ["proofUrl", "proofThumbUrl"] });
  }
  return row;
}

async function resolveClientId(userId: string): Promise<string> {
  const client = await prisma.client.findUnique({ where: { userId }, select: { id: true } });
  if (!client) throw ApiError.forbidden("No client profile linked to this account");
  return client.id;
}

async function clientContact(userId: string | undefined | null) {
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true } });
}

export const logisticsService = {
  async createRequest(clientId: string, data: CreateLogisticsInput) {
    const created = await logisticsRepository.create(clientId, data);

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { companyName: true },
    });
    const companyName = client?.companyName ?? "A client";

    await notifyAdminsAndStaff({
      type: "logistics",
      title: `🚚 New Logistics Request — ${created.requestNumber}`,
      message: `${companyName} submitted a ${created.shippingMethod} shipment request.`,
      relatedType: "LOGISTICS",
      relatedId: created.id,
    }).catch(() => {});

    const staffAndAdmins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "STAFF"] }, isActive: true },
      select: { email: true, firstName: true },
    });
    const dashboardUrl = `${FRONTEND_URL}/admin/logistics/${created.id}`;
    for (const staff of staffAndAdmins) {
      sendEmail({
        to: staff.email,
        subject: `New Logistics Request: ${created.requestNumber} from ${companyName}`,
        html: `<p>Hi ${staff.firstName},</p><p><strong>${companyName}</strong> submitted logistics request <strong>${created.requestNumber}</strong> (${created.shippingMethod}). Please review and send a quote.</p><p><a href="${dashboardUrl}">View Request</a></p>`,
      }).catch(() => {});
    }

    return signLogistics(created);
  },

  async getRequests(query: ListQuery, userId: string, role: string, clientIdFromAuth?: string) {
    const { page, limit, skip, take } = getPagination(query);

    let clientId: string | undefined = clientIdFromAuth;
    if (role === "CLIENT" && !clientId) clientId = await resolveClientId(userId);

    const [requests, total] = await logisticsRepository.findAll({
      clientId,
      status: query.status,
      confirmedOnly: query.view === "orders",
      skip,
      take,
    });

    for (const r of requests) await signLogistics(r);
    const pagination = buildPaginationMeta(total, page, limit);
    return { requests, pagination };
  },

  async getRequestById(id: string, userId: string, role: string) {
    let clientId: string | undefined;
    if (role === "CLIENT") clientId = await resolveClientId(userId);
    const request = await logisticsRepository.findById(id, clientId);
    return signLogistics(request);
  },

  async sendQuote(id: string, data: QuoteLogisticsInput) {
    const existing = await logisticsRepository.findBasic(id);
    if (!existing) throw ApiError.notFound("Logistics request not found");
    if (["CONFIRMED", "CANCELLED"].includes(existing.status)) {
      throw ApiError.badRequest("Cannot quote a request that is already confirmed or cancelled");
    }

    const updated = await logisticsRepository.quote(id, data);

    await notifyUser(existing.client.userId, {
      type: "logistics",
      title: `📦 Logistics Quote Ready — ${updated.requestNumber}`,
      message: `Your shipment quote is ready: ₹${Number(data.estimatedPriceINR).toLocaleString("en-IN")}. Review to accept, reject, or counter.`,
      relatedType: "LOGISTICS",
      relatedId: id,
    }).catch(() => {});

    const contact = await clientContact(existing.client.userId);
    if (contact?.email) {
      sendEmail({
        to: contact.email,
        subject: `Logistics Quote Ready: ${updated.requestNumber}`,
        html: `<p>Hi ${contact.firstName},</p><p>Your logistics quote for <strong>${updated.requestNumber}</strong> is ready — <strong>₹${Number(data.estimatedPriceINR).toLocaleString("en-IN")}</strong> via ${data.carrier} (${data.shippingMode}).</p><p><a href="${FRONTEND_URL}/client-dashboard/logistics/${id}">Review &amp; respond</a></p>`,
      }).catch(() => {});
    }

    return updated;
  },

  async respond(id: string, clientUserId: string, data: RespondLogisticsInput) {
    const clientId = await resolveClientId(clientUserId);
    const existing = await logisticsRepository.findBasic(id);
    if (!existing || existing.client.id !== clientId) {
      throw ApiError.notFound("Logistics request not found");
    }
    if (existing.status !== "QUOTED") {
      throw ApiError.badRequest("This request has no active quote to respond to");
    }

    const updated = await logisticsRepository.respond(id, data);

    const label =
      data.response === "ACCEPTED"
        ? "accepted the quote — awaiting payment"
        : data.response === "REJECTED"
        ? "rejected the quote"
        : `sent a counter offer (₹${Number(data.counterPriceINR).toLocaleString("en-IN")})`;
    await notifyAdminsAndStaff({
      type: "logistics",
      title: `📝 Logistics Response — ${updated.requestNumber}`,
      message: `${existing.client.companyName} ${label}.`,
      relatedType: "LOGISTICS",
      relatedId: id,
    }).catch(() => {});

    return updated;
  },

  async respondCounter(id: string, data: RespondCounterLogisticsInput) {
    const existing = await logisticsRepository.findBasic(id);
    if (!existing) throw ApiError.notFound("Logistics request not found");
    if (existing.status !== "COUNTERED") {
      throw ApiError.badRequest("There is no pending counter offer to respond to");
    }

    const updated = await logisticsRepository.respondCounter(id, data);

    await notifyUser(existing.client.userId, {
      type: "logistics",
      title: `📦 Updated Logistics Quote — ${updated.requestNumber}`,
      message: `Our team responded to your counter with ₹${Number(data.estimatedPriceINR).toLocaleString("en-IN")}. Please review.`,
      relatedType: "LOGISTICS",
      relatedId: id,
    }).catch(() => {});

    const contact = await clientContact(existing.client.userId);
    if (contact?.email) {
      sendEmail({
        to: contact.email,
        subject: `Updated Logistics Quote: ${updated.requestNumber}`,
        html: `<p>Hi ${contact.firstName},</p><p>We've responded to your counter offer for <strong>${updated.requestNumber}</strong>. Please log in to review the updated price.</p><p><a href="${FRONTEND_URL}/client-dashboard/logistics/${id}">Review quote</a></p>`,
      }).catch(() => {});
    }

    return updated;
  },

  async updatePhase(id: string, data: UpdatePhaseInput) {
    const existing = await logisticsRepository.findBasic(id);
    if (!existing) throw ApiError.notFound("Logistics request not found");
    if (existing.status !== "CONFIRMED") {
      throw ApiError.badRequest("Only confirmed logistics orders can be advanced");
    }

    const updated = await logisticsRepository.updatePhase(id, data.phase);

    const phaseLabel: Record<string, string> = {
      AT_WAREHOUSE: "At Warehouse",
      FLIGHT_BOOKED: "Flight Booked for India",
      IN_TRANSIT: "In Transit",
      INDIA_WAREHOUSE: "Arrived at India Warehouse",
    };
    await notifyUser(existing.client.userId, {
      type: "logistics",
      title: `🚚 Shipment Update — ${updated.requestNumber}`,
      message: `Your shipment is now: ${phaseLabel[data.phase] ?? data.phase}.`,
      relatedType: "LOGISTICS",
      relatedId: id,
    }).catch(() => {});

    return updated;
  },

  async setDeliveryMode(id: string, clientUserId: string, data: DeliveryModeInput) {
    const clientId = await resolveClientId(clientUserId);
    const existing = await logisticsRepository.findBasic(id);
    if (!existing || existing.client.id !== clientId) {
      throw ApiError.notFound("Logistics request not found");
    }
    if (existing.status !== "CONFIRMED") {
      throw ApiError.badRequest("Delivery preference can only be set on a confirmed order");
    }
    return logisticsRepository.setDeliveryMode(id, data);
  },

  async uploadSlip(id: string, clientUserId: string, data: UploadSlipInput) {
    const clientId = await resolveClientId(clientUserId);
    const existing = await logisticsRepository.findBasic(id);
    if (!existing || existing.client.id !== clientId) {
      throw ApiError.notFound("Logistics request not found");
    }
    if (existing.status !== "CONFIRMED") {
      throw ApiError.badRequest("Upload a warehouse slip only after the order is confirmed");
    }

    const updated = await logisticsRepository.uploadSlip(
      id,
      data.warehouseSlipUrl,
      data.warehouseSlipThumbUrl
    );

    await notifyAdminsAndStaff({
      type: "logistics",
      title: `📄 Warehouse Slip Uploaded — ${updated.requestNumber}`,
      message: `${existing.client.companyName} uploaded a warehouse slip. Confirm cargo receipt.`,
      relatedType: "LOGISTICS",
      relatedId: id,
    }).catch(() => {});

    return signLogistics(updated);
  },

  async confirmCargo(id: string, data: ConfirmCargoInput) {
    const existing = await logisticsRepository.findBasic(id);
    if (!existing) throw ApiError.notFound("Logistics request not found");

    const updated = await logisticsRepository.confirmCargo(id, data.confirmedBy);

    await notifyUser(existing.client.userId, {
      type: "logistics",
      title: `✅ Cargo Received — ${updated.requestNumber}`,
      message: `Your cargo has been received at our China warehouse and is being processed.`,
      relatedType: "LOGISTICS",
      relatedId: id,
    }).catch(() => {});

    return updated;
  },

  async cancelRequest(id: string, userId: string, role: string, reason?: string) {
    const existing = await logisticsRepository.findBasic(id);
    if (!existing) throw ApiError.notFound("Logistics request not found");

    if (role === "CLIENT") {
      const clientId = await resolveClientId(userId);
      if (existing.client.id !== clientId) throw ApiError.forbidden("Access denied");
    }
    if (["CONFIRMED", "CANCELLED", "REJECTED"].includes(existing.status)) {
      throw ApiError.badRequest(`Cannot cancel a ${existing.status.toLowerCase()} request`);
    }

    const updated = await logisticsRepository.cancel(id, reason);

    if (role === "CLIENT") {
      await notifyAdminsAndStaff({
        type: "logistics",
        title: `Logistics Request Cancelled — ${updated.requestNumber}`,
        message: `${existing.client.companyName} cancelled their logistics request.`,
        relatedType: "LOGISTICS",
        relatedId: id,
      }).catch(() => {});
    }

    return updated;
  },

  async sendMessage(id: string, userId: string, role: string, text: string) {
    const existing = await logisticsRepository.findBasic(id);
    if (!existing) throw ApiError.notFound("Logistics request not found");
    if (role === "CLIENT") {
      const clientId = await resolveClientId(userId);
      if (existing.client.id !== clientId) throw ApiError.forbidden("Access denied");
    }
    return logisticsRepository.createMessage(id, userId, role, text);
  },

  async getMessages(id: string, userId: string, role: string, since?: string) {
    const existing = await logisticsRepository.findBasic(id);
    if (!existing) throw ApiError.notFound("Logistics request not found");
    if (role === "CLIENT") {
      const clientId = await resolveClientId(userId);
      if (existing.client.id !== clientId) throw ApiError.forbidden("Access denied");
    }
    return logisticsRepository.getMessages(id, since);
  },
};
