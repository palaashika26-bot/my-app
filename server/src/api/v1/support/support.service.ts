import { supportRepository } from "./support.repository";
import { ApiError } from "../../../utils/ApiError";
import { notifyUser, notifyAdminsAndStaff } from "../../../utils/notify";
import { signImageFields } from "../../../config/storage";
import { CreateTicketInput } from "./support.schema";

type Role = string;

function isStaffRole(role: Role) {
  return role === "ADMIN" || role === "STAFF";
}

// Shared light fields for both list + detail.
function baseFields(t: any) {
  const u = t.client?.user;
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    category: t.category,
    status: t.status,
    priority: t.priority,
    orderId: t.orderId,
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

export const supportService = {
  async createTicket(clientId: string, userId: string, data: CreateTicketInput) {
    const ticketNumber = await supportRepository.nextTicketNumber();
    const ticket = await supportRepository.create({
      ticketNumber,
      clientId,
      subject: data.subject.trim(),
      category: data.category.trim(),
      description: data.description.trim(),
      orderId: data.orderId?.trim() || null,
      priority: data.priority?.trim() || null,
    });

    // The original description (+ any attachments) becomes the first chat message.
    await supportRepository.addMessage({
      ticketId: ticket.id,
      senderId: userId,
      senderRole: "CLIENT",
      text: data.description.trim(),
      attachments: data.attachments ?? [],
    });

    await notifyAdminsAndStaff({
      type: "support",
      title: `🎫 New Support Ticket — ${ticketNumber}`,
      message: `${data.subject.trim()} (${data.category.trim()})`,
      relatedType: "SUPPORT_TICKET",
      relatedId: ticket.id,
    });

    return this.getTicket(ticket.id, userId, "CLIENT", clientId);
  },

  async listTickets(role: Role, clientId?: string) {
    const where = isStaffRole(role) ? {} : { clientId: clientId ?? "__none__" };
    const tickets = await supportRepository.findForList(where);
    const meta = await supportRepository.messageMetaForTickets(tickets.map((t) => t.id));

    return tickets.map((t) => {
      const lastRead = role === "CLIENT" ? t.clientLastReadAt : t.staffLastReadAt;
      let unreadCount = 0;
      let lastMessageAt: Date | null = null;
      for (const m of meta) {
        if (m.ticketId !== t.id) continue;
        if (!lastMessageAt || m.createdAt > lastMessageAt) lastMessageAt = m.createdAt;
        const fromOther = role === "CLIENT" ? m.senderRole !== "CLIENT" : m.senderRole === "CLIENT";
        if (fromOther && (!lastRead || m.createdAt > lastRead)) unreadCount++;
      }
      return { ...baseFields(t), lastMessageAt, unreadCount };
    });
  },

  async getTicket(id: string, userId: string, role: Role, clientId?: string) {
    const ticket = await supportRepository.findById(id);
    if (!ticket) throw ApiError.notFound("Ticket not found");
    if (!isStaffRole(role) && ticket.clientId !== clientId) {
      throw ApiError.forbidden("You do not have access to this ticket");
    }

    // Mark the viewer's side as read (powers the unread badge).
    await supportRepository.stampRead(id, role);

    const messages = ticket.messages.map(serializeMessage);
    // Convert storage-path attachments to signed read URLs (legacy base64 passes through).
    await signImageFields(messages, { arrays: ["attachments"] });

    return {
      ...baseFields(ticket),
      description: ticket.description,
      clientUserId: ticket.client?.user?.id ?? null,
      messages,
    };
  },

  async addMessage(
    id: string,
    userId: string,
    role: Role,
    data: { text?: string; attachments?: string[] },
    clientId?: string
  ) {
    const ticket = await supportRepository.findById(id);
    if (!ticket) throw ApiError.notFound("Ticket not found");
    if (!isStaffRole(role) && ticket.clientId !== clientId) {
      throw ApiError.forbidden("You do not have access to this ticket");
    }

    const message = await supportRepository.addMessage({
      ticketId: id,
      senderId: userId,
      senderRole: role,
      text: (data.text ?? "").trim(),
      attachments: data.attachments ?? [],
    });

    // A client reply re-opens a resolved ticket into progress; keep open ones moving.
    if (ticket.status === "OPEN") {
      await supportRepository.updateStatus(id, "IN_PROGRESS");
    }

    const clientUserId = ticket.client?.user?.id;
    if (isStaffRole(role)) {
      if (clientUserId) {
        await notifyUser(clientUserId, {
          type: "support",
          title: `💬 Support Replied — ${ticket.ticketNumber}`,
          message: `Our team replied to your ticket "${ticket.subject}".`,
          relatedType: "SUPPORT_TICKET",
          relatedId: id,
        });
      }
    } else {
      await notifyAdminsAndStaff({
        type: "support",
        title: `💬 Ticket Reply — ${ticket.ticketNumber}`,
        message: `${ticket.client?.companyName ?? "Client"} replied on "${ticket.subject}".`,
        relatedType: "SUPPORT_TICKET",
        relatedId: id,
      });
    }

    const serialized = serializeMessage(message);
    await signImageFields(serialized, { arrays: ["attachments"] });
    return serialized;
  },

  async updateStatus(id: string, role: Role, status: string) {
    if (!isStaffRole(role)) throw ApiError.forbidden("Only staff can change ticket status");
    const ticket = await supportRepository.findById(id);
    if (!ticket) throw ApiError.notFound("Ticket not found");

    const updated = await supportRepository.updateStatus(id, status);

    const clientUserId = ticket.client?.user?.id;
    if (clientUserId) {
      await notifyUser(clientUserId, {
        type: "support",
        title: `🎫 Ticket ${status.replace("_", " ")} — ${ticket.ticketNumber}`,
        message: `Your ticket "${ticket.subject}" is now ${status.replace("_", " ").toLowerCase()}.`,
        relatedType: "SUPPORT_TICKET",
        relatedId: id,
      });
    }
    return { id: updated.id, status: updated.status };
  },
};
