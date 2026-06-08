import prisma from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";
import { getPagination, buildPaginationMeta } from "../../../utils/pagination";
import { requestsRepository } from "./requests.repository";
import { sendEmail } from "../../../config/email";
import { notifyAdminsAndStaff } from "../../../utils/notify";
import { quotationEmailTemplate } from "../../../templates/quotationEmail";
import type { CreateRequestInput, CreateRequestInputV2, SendQuotationInput, RespondToQuotationInput, RespondToCounterInput, LogisticsInput } from "./requests.schema";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

interface RequestQuery {
  page?: string;
  limit?: string;
  status?: string;
}

export const requestsService = {
  async createRequest(clientId: string, data: CreateRequestInput | CreateRequestInputV2) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!client) {
      throw new ApiError(403, "Client profile not found. Please complete setup.");
    }

    // Validate CATALOG items
    const resolvedItems = await Promise.all(
      (data.items as any[]).map(async (item: any) => {
        if (item.type === "CATALOG") {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { id: true, name: true, isActive: true },
          });
          if (!product || !product.isActive) {
            throw ApiError.badRequest(
              `Product not found or no longer active: ${item.productId}`
            );
          }
          return { ...item, productName: product.name };
        }
        return item;
      })
    );

    const referenceNote = (data as CreateRequestInputV2).referenceNote;
    const requestType = data.requestType ?? "SOURCING";
    const createdRequest = await requestsRepository.createWithReferenceData(client.id, {
      notes: data.notes,
      referenceNote,
      requestType,
      totalBudgetINR: data.totalBudgetINR,
      items: resolvedItems.map((item) => ({
        type: item.type,
        productId: item.productId,
        productName: item.productName,
        productDescription: item.productDescription,
        quantity: item.quantity,
        unit: item.unit,
        targetPriceINR: item.targetPriceINR,
        notes: item.notes,
        referenceImageUrls: (item as any).referenceImageUrls ?? [],
      })),
    });

    // Re-fetch request with items included so TypeScript knows about the relation
    const request = await prisma.sourcingRequest.findUnique({
      where: { id: createdRequest.id },
      include: { items: true },
    });

    if (!request) throw new ApiError(500, "Failed to fetch created request");

    // Notify all ADMIN + STAFF (fire-and-forget)
    const staffAndAdmins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "STAFF"] }, isActive: true },
      select: { email: true, firstName: true },
    });

    const dashboardUrl = `${FRONTEND_URL}/staff/sourcing/requests/${request.id}`;
    const clientName = `${client.user.firstName} ${client.user.lastName}`;
    const itemNames = request.items.map((i) => i.productName).join(", ");

    for (const staff of staffAndAdmins) {
      sendEmail({
        to: staff.email,
        subject: `New Sourcing Request: ${request.requestNumber} from ${client.companyName}`,
        html: `<p>Hi ${staff.firstName},</p>
<p><strong>${clientName}</strong> from <strong>${client.companyName}</strong> submitted sourcing request <strong>${request.requestNumber}</strong> with ${request.items.length} item(s): ${itemNames}.</p>
<p><a href="${dashboardUrl}">View Request in Dashboard</a></p>`,
      }).catch(() => {});
    }

    return request;
  },

  async getRequests(query: RequestQuery, userId: string, role: string, clientIdFromAuth?: string) {
    const { page, limit, skip, take } = getPagination(query);
    const status = query.status;

    let clientId: string | undefined = clientIdFromAuth;
    if (role === "CLIENT" && !clientId) {
      const client = await prisma.client.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!client) throw ApiError.forbidden("No client profile linked to this account");
      clientId = client.id;
    }

    const [requests, total] = await requestsRepository.findAll({
      clientId,
      status,
      skip,
      take,
    });

    const pagination = buildPaginationMeta(total, page, limit);
    return { requests, pagination };
  },

  async getRequestById(id: string, userId: string, role: string) {
    let clientId: string | undefined;
    if (role === "CLIENT") {
      const client = await prisma.client.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!client) throw ApiError.forbidden("No client profile linked to this account");
      clientId = client.id;
    }
    return requestsRepository.findById(id, clientId);
  },

  async updateLogistics(requestId: string, data: LogisticsInput) {
    const existing = await prisma.sourcingRequest.findUnique({
      where: { id: requestId },
      select: { id: true },
    });
    if (!existing) throw ApiError.notFound("Request not found");
    return requestsRepository.updateLogistics(requestId, data);
  },

  async sendQuotation(
    requestId: string,
    data: SendQuotationInput,
    staffUserId: string
  ) {
    const existing = await prisma.sourcingRequest.findUnique({
      where: { id: requestId },
      include: { client: { include: { user: { select: { email: true, firstName: true } } } } },
    });
    if (!existing) throw ApiError.notFound("Request not found");
    if (existing.status === "CONVERTED" || existing.status === "REJECTED") {
      throw ApiError.badRequest("Cannot quote a request that is already converted or rejected");
    }

    const updated = await requestsRepository.sendQuotation(
      requestId,
      data.items,
      staffUserId,
      data.staffNotes,
      data.advanceAmountINR
    );

    // Notify client via email (fire-and-forget). The whole block is wrapped so
    // that a failure building the template or sending the mail can never bubble
    // up and 500 the quotation itself — the quote is already committed above.
    try {
      const clientEmail = existing.client.user.email;
      const clientFirstName = existing.client.user.firstName;
      const quotedItems = updated.items
        .filter((i) => i.quotedINR != null)
        .map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          unit: i.unit,
          unitPriceINR: parseFloat(i.quotedINR!.toString()),
        }));
      const totalINR = quotedItems.reduce(
        (sum, i) => sum + i.unitPriceINR * i.quantity,
        0
      );

      sendEmail({
        to: clientEmail,
        subject: `Quotation Ready: ${existing.requestNumber}`,
        html: quotationEmailTemplate({
          clientName: clientFirstName,
          requestNumber: existing.requestNumber,
          requestId,
          items: quotedItems,
          totalINR,
          frontendUrl: FRONTEND_URL,
        }),
      }).catch(() => {});
    } catch (err) {
      console.error("Failed to build/send quotation email:", err);
    }

    return updated;
  },

  async approveAndConvert(requestId: string, userId: string, role: string = "STAFF") {
    // CLIENT can only approve their own requests
    if (role === "CLIENT") {
      const client = await prisma.client.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!client) throw ApiError.forbidden("Client profile not found");
      const owned = await prisma.sourcingRequest.findFirst({
        where: { id: requestId, clientId: client.id },
        select: { id: true },
      });
      if (!owned) throw ApiError.forbidden("Request not found or access denied");
    }

    const existing = await prisma.sourcingRequest.findUnique({
      where: { id: requestId },
      select: { status: true },
    });
    if (!existing) throw ApiError.notFound("Request not found");
    if (!["QUOTED", "ACCEPTED", "PARTIALLY_ACCEPTED"].includes(existing.status)) {
      throw ApiError.badRequest("Request cannot be converted to order in its current status");
    }

    const result = await requestsRepository.approveRequest(requestId, userId);

    // Notify client (fire-and-forget)
    const clientInfo = await prisma.sourcingRequest.findUnique({
      where: { id: requestId },
      include: { client: { include: { user: { select: { email: true, firstName: true } } } } },
    });
    if (clientInfo) {
      sendEmail({
        to: clientInfo.client.user.email,
        subject: `Order Created: ${result.order.orderNumber}`,
        html: `<p>Hi ${clientInfo.client.user.firstName},</p>
<p>Your sourcing request <strong>${clientInfo.requestNumber}</strong> has been approved and converted to order <strong>${result.order.orderNumber}</strong>.</p>
<p>Our team will begin sourcing your products shortly.</p>`,
      }).catch(() => {});
    }

    return result;
  },

  async respondToQuotation(
    requestId: string,
    clientUserId: string,
    data: RespondToQuotationInput
  ) {
    const client = await prisma.client.findUnique({
      where: { userId: clientUserId },
      select: { id: true, companyName: true, user: { select: { email: true, firstName: true } } },
    });
    if (!client) throw ApiError.forbidden("No client profile found");

    const existing = await prisma.sourcingRequest.findFirst({
      where: { id: requestId, clientId: client.id },
      select: { id: true, status: true, requestNumber: true },
    });
    if (!existing) throw ApiError.notFound("Request not found");
    if (!["QUOTED", "REVIEWING"].includes(existing.status)) {
      throw ApiError.badRequest("Request is not in a quotable state");
    }

    const updated = await requestsRepository.respondToQuotation(
      requestId,
      clientUserId,
      data.items
    );

    // In-app bell for admin + staff — every client response (accept / partial /
    // counter / reject) surfaces in the bell. Emails below stay for accept/counter.
    const responseLabel: Record<string, string> = {
      ACCEPTED: "accepted the quotation — awaiting payment",
      PARTIALLY_ACCEPTED: "partially accepted the quotation — awaiting payment",
      REVIEWING: "submitted a counter offer — please review",
      REJECTED: "rejected the quotation",
    };
    const label = responseLabel[updated.status];
    if (label) {
      await notifyAdminsAndStaff({
        type: "request",
        title: `📝 Quotation Response — ${existing.requestNumber}`,
        message: `${client.companyName} ${label}.`,
        relatedType: "REQUEST",
        relatedId: requestId,
      });
    }

    // Notify staff when client accepts or partially accepts
    if (updated.status === "ACCEPTED" || updated.status === "PARTIALLY_ACCEPTED") {
      const staffAndAdmins = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "STAFF"] }, isActive: true },
        select: { email: true, firstName: true },
      });
      const dashboardUrl = `${FRONTEND_URL}/admin/requests/${requestId}`;
      for (const staff of staffAndAdmins) {
        sendEmail({
          to: staff.email,
          subject: `Quotation Accepted: ${existing.requestNumber} — Awaiting Payment`,
          html: `<p>Hi ${staff.firstName},</p>
<p><strong>${client.companyName}</strong> has accepted the quotation for request <strong>${existing.requestNumber}</strong>.</p>
<p>Status: <strong>${updated.status}</strong>. Order will be created after payment is verified.</p>
<p><a href="${dashboardUrl}">View Request</a></p>`,
        }).catch(() => {});
      }
    }

    // Notify staff of counter offers
    if (updated.status === "REVIEWING") {
      const staffAndAdmins = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "STAFF"] }, isActive: true },
        select: { email: true, firstName: true },
      });
      for (const staff of staffAndAdmins) {
        sendEmail({
          to: staff.email,
          subject: `Counter offer received: ${existing.requestNumber}`,
          html: `<p>Hi ${staff.firstName},</p><p>Client has submitted counter offers for request <strong>${existing.requestNumber}</strong>. Please review and respond.</p>`,
        }).catch(() => {});
      }
    }

    return { request: updated, autoConverted: false };
  },

  async respondToCounter(
    requestId: string,
    staffUserId: string,
    data: RespondToCounterInput
  ) {
    const existing = await prisma.sourcingRequest.findUnique({
      where: { id: requestId },
      include: { client: { include: { user: { select: { email: true, firstName: true } } } } },
    });
    if (!existing) throw ApiError.notFound("Request not found");

    const updated = await requestsRepository.respondToCounter(
      requestId,
      staffUserId,
      data.items
    );

    // Notify client
    sendEmail({
      to: existing.client.user.email,
      subject: `Updated quotation: ${existing.requestNumber}`,
      html: `<p>Hi ${existing.client.user.firstName},</p><p>Our team has responded to your counter offer for request <strong>${existing.requestNumber}</strong>. Please log in to review the updated pricing.</p>`,
    }).catch(() => {});

    return updated;
  },

  async rejectRequest(
    requestId: string,
    staffUserId: string,
    reason?: string
  ) {
    const existing = await prisma.sourcingRequest.findUnique({
      where: { id: requestId },
      include: { client: { include: { user: { select: { email: true, firstName: true } } } } },
    });
    if (!existing) throw ApiError.notFound("Request not found");
    if (existing.status === "CONVERTED") {
      throw ApiError.badRequest("Cannot reject an already converted request");
    }

    const updated = await requestsRepository.rejectRequest(
      requestId,
      staffUserId,
      reason
    );

    // Notify client (fire-and-forget)
    sendEmail({
      to: existing.client.user.email,
      subject: `Request Update: ${existing.requestNumber}`,
      html: `<p>Hi ${existing.client.user.firstName},</p>
<p>Your sourcing request <strong>${existing.requestNumber}</strong> has been rejected.</p>
${reason ? `<p>Reason: ${reason}</p>` : ""}
<p>Please contact our team if you have questions.</p>`,
    }).catch(() => {});

    return updated;
  },

  async cancelRequest(
    requestId: string,
    userId: string,
    role: string,
    cancelReason?: string
  ) {
    // CLIENT can only cancel their own requests
    if (role === "CLIENT") {
      const client = await prisma.client.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!client) throw ApiError.forbidden("Client profile not found");
      const owned = await prisma.sourcingRequest.findFirst({
        where: { id: requestId, clientId: client.id },
        select: { id: true },
      });
      if (!owned) throw ApiError.forbidden("Request not found or access denied");
    }

    const existing = await prisma.sourcingRequest.findUnique({
      where: { id: requestId },
      include: {
        client: { include: { user: { select: { email: true, firstName: true, lastName: true } } } },
      },
    });
    if (!existing) throw ApiError.notFound("Request not found");
    if (existing.status === "CONVERTED") {
      throw ApiError.badRequest("Cannot cancel a request that has already been converted to an order");
    }
    if (existing.status === "REJECTED") {
      throw ApiError.badRequest("Cannot cancel a request that has been rejected");
    }
    if (existing.status === "CANCELLED") {
      throw ApiError.badRequest("Request is already cancelled");
    }

    const updated = await requestsRepository.cancelRequest(requestId, userId, cancelReason);

    // Notify ADMIN + STAFF when a client withdraws a request (fire-and-forget)
    if (role === "CLIENT") {
      const staffAndAdmins = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "STAFF"] }, isActive: true },
        select: { email: true, firstName: true },
      });
      const clientName = `${existing.client.user.firstName} ${existing.client.user.lastName}`;
      const dashboardUrl = `${FRONTEND_URL}/staff/sourcing/requests/${requestId}`;
      for (const staff of staffAndAdmins) {
        sendEmail({
          to: staff.email,
          subject: `Request Cancelled: ${existing.requestNumber}`,
          html: `<p>Hi ${staff.firstName},</p>
<p><strong>${clientName}</strong> from <strong>${existing.client.companyName}</strong> has cancelled sourcing request <strong>${existing.requestNumber}</strong>.</p>
${cancelReason ? `<p>Reason: ${cancelReason}</p>` : ""}
<p><a href="${dashboardUrl}">View Request</a></p>`,
        }).catch(() => {});
      }
    }

    return updated;
  },

  async sendMessage(requestId: string, senderId: string, senderRole: string, text: string) {
    const request = await prisma.sourcingRequest.findUnique({
      where: { id: requestId },
      select: { id: true },
    });
    if (!request) throw new ApiError(404, "Request not found");
    return requestsRepository.createMessage(requestId, senderId, senderRole, text);
  },

  async getMessages(requestId: string, userId: string, role: string, since?: string) {
    // Verify access: client can only see their own request messages
    if (role === "CLIENT") {
      const client = await prisma.client.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!client) throw new ApiError(403, "No client profile");
      const request = await prisma.sourcingRequest.findFirst({
        where: { id: requestId, clientId: client.id },
        select: { id: true },
      });
      if (!request) throw new ApiError(404, "Request not found");
    }
    return requestsRepository.getMessages(requestId, since);
  },
};