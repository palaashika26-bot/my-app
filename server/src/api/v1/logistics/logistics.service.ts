import { logisticsRepository } from "./logistics.repository";
import { ApiError } from "../../../utils/ApiError";
import { notifyUser, notifyAdminsAndStaff } from "../../../utils/notify";
import { CreateLogisticsInput } from "./logistics.schema";

type Role = string;
const isStaff = (r: Role) => r === "ADMIN" || r === "STAFF";

function baseFields(t: any) {
  const u = t.client?.user;
  return {
    id: t.id,
    requestNumber: t.requestNumber,
    orderRef: t.orderRef,
    weightKg: t.weightKg,
    cbm: t.cbm,
    shippingMethod: t.shippingMethod,
    status: t.status,
    quotePricePerKg: t.quotePricePerKg != null ? String(t.quotePricePerKg) : null,
    quoteNote: t.quoteNote,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    clientName: u ? `${u.firstName} ${u.lastName}`.trim() : "",
    clientEmail: u?.email ?? "",
    companyName: t.client?.companyName ?? "",
  };
}

function serializeMessage(m: any) {
  const name = m.sender ? `${m.sender.firstName} ${m.sender.lastName}`.trim() : "";
  return {
    id: m.id,
    senderRole: m.senderRole,
    senderName: name,
    text: m.text,
    attachments: m.attachments ?? [],
    createdAt: m.createdAt,
  };
}

export const logisticsService = {
  async create(clientId: string, userId: string, data: CreateLogisticsInput) {
    const requestNumber = await logisticsRepository.nextRequestNumber();
    const packaging = data.packagingList ?? [];
    const request = await logisticsRepository.create({
      requestNumber,
      clientId,
      orderRef: data.orderRef?.trim() || null,
      weightKg: data.weightKg?.trim() || null,
      cbm: data.cbm?.trim() || null,
      shippingMethod: data.shippingMethod?.trim() || null,
      packagingList: packaging,
    });

    // Seed the chat with the request summary so admin/staff see context immediately.
    const summary = [
      data.weightKg ? `Weight: ${data.weightKg}` : null,
      data.cbm ? `Volume: ${data.cbm} CBM` : null,
      data.shippingMethod ? `Method: ${data.shippingMethod}` : null,
      data.orderRef ? `Order: ${data.orderRef}` : null,
      data.note?.trim() ? data.note.trim() : null,
    ].filter(Boolean).join(" · ") || "New logistics request";

    await logisticsRepository.addMessage({
      logisticsId: request.id,
      senderId: userId,
      senderRole: "CLIENT",
      text: summary,
      attachments: packaging,
    });

    await notifyAdminsAndStaff({
      type: "logistics",
      title: `📦 New Logistics Request — ${requestNumber}`,
      message: summary,
      relatedType: "LOGISTICS",
      relatedId: request.id,
    });

    return this.getById(request.id, userId, "CLIENT", clientId);
  },

  async list(role: Role, clientId?: string) {
    const where = isStaff(role) ? {} : { clientId: clientId ?? "__none__" };
    const rows = await logisticsRepository.findForList(where);
    const meta = await logisticsRepository.messageMetaFor(rows.map((r) => r.id));

    return rows.map((t) => {
      const lastRead = role === "CLIENT" ? t.clientLastReadAt : t.staffLastReadAt;
      let unreadCount = 0;
      let lastMessageAt: Date | null = null;
      for (const m of meta) {
        if (m.logisticsId !== t.id) continue;
        if (!lastMessageAt || m.createdAt > lastMessageAt) lastMessageAt = m.createdAt;
        const fromOther = role === "CLIENT" ? m.senderRole !== "CLIENT" : m.senderRole === "CLIENT";
        if (fromOther && (!lastRead || m.createdAt > lastRead)) unreadCount++;
      }
      return { ...baseFields(t), lastMessageAt, unreadCount };
    });
  },

  async getById(id: string, userId: string, role: Role, clientId?: string) {
    const req = await logisticsRepository.findById(id);
    if (!req) throw ApiError.notFound("Logistics request not found");
    if (!isStaff(role) && req.clientId !== clientId) {
      throw ApiError.forbidden("You do not have access to this request");
    }
    await logisticsRepository.stampRead(id, role);
    return {
      ...baseFields(req),
      packagingList: req.packagingList ?? [],
      clientUserId: req.client?.user?.id ?? null,
      messages: req.messages.map(serializeMessage),
    };
  },

  async addMessage(
    id: string,
    userId: string,
    role: Role,
    data: { text?: string; attachments?: string[] },
    clientId?: string
  ) {
    const req = await logisticsRepository.findById(id);
    if (!req) throw ApiError.notFound("Logistics request not found");
    if (!isStaff(role) && req.clientId !== clientId) {
      throw ApiError.forbidden("You do not have access to this request");
    }

    const message = await logisticsRepository.addMessage({
      logisticsId: id,
      senderId: userId,
      senderRole: role,
      text: (data.text ?? "").trim(),
      attachments: data.attachments ?? [],
    });

    const clientUserId = req.client?.user?.id;
    if (isStaff(role)) {
      if (clientUserId) {
        await notifyUser(clientUserId, {
          type: "logistics",
          title: `💬 Logistics Update — ${req.requestNumber}`,
          message: `Our team replied to your logistics request ${req.requestNumber}.`,
          relatedType: "LOGISTICS",
          relatedId: id,
        });
      }
    } else {
      await notifyAdminsAndStaff({
        type: "logistics",
        title: `💬 Logistics Reply — ${req.requestNumber}`,
        message: `${req.client?.companyName ?? "Client"} replied on logistics ${req.requestNumber}.`,
        relatedType: "LOGISTICS",
        relatedId: id,
      });
    }
    return serializeMessage(message);
  },

  async updateQuote(id: string, role: Role, pricePerKg?: string | null, note?: string | null) {
    if (!isStaff(role)) throw ApiError.forbidden("Only staff can quote");
    const req = await logisticsRepository.findById(id);
    if (!req) throw ApiError.notFound("Logistics request not found");

    const priceNum = pricePerKg != null && `${pricePerKg}`.trim() !== "" ? Number(pricePerKg) : null;
    const updated = await logisticsRepository.updateQuote(id, {
      quotePricePerKg: priceNum != null && !Number.isNaN(priceNum) ? priceNum : null,
      quoteNote: note?.trim() || null,
    });

    const clientUserId = req.client?.user?.id;
    if (clientUserId) {
      await notifyUser(clientUserId, {
        type: "logistics",
        title: `💰 Logistics Quote Ready — ${req.requestNumber}`,
        message: `A shipping quote is ready for your logistics request ${req.requestNumber}.`,
        relatedType: "LOGISTICS",
        relatedId: id,
      });
    }
    return { id: updated.id, status: updated.status, quotePricePerKg: String(updated.quotePricePerKg) };
  },

  async updateStatus(id: string, role: Role, status: string) {
    if (!isStaff(role)) throw ApiError.forbidden("Only staff can change status");
    const req = await logisticsRepository.findById(id);
    if (!req) throw ApiError.notFound("Logistics request not found");
    const updated = await logisticsRepository.updateStatus(id, status);

    const clientUserId = req.client?.user?.id;
    if (clientUserId) {
      await notifyUser(clientUserId, {
        type: "logistics",
        title: `📦 Logistics ${status.replace("_", " ")} — ${req.requestNumber}`,
        message: `Your logistics request ${req.requestNumber} is now ${status.replace("_", " ").toLowerCase()}.`,
        relatedType: "LOGISTICS",
        relatedId: id,
      });
    }
    return { id: updated.id, status: updated.status };
  },
};
