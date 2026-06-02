import prisma from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";
import { getPagination, buildPaginationMeta } from "../../../utils/pagination";
import { inquiriesRepository } from "./inquiries.repository";
import { sendEmail } from "../../../config/email";
import { newInquiryEmailTemplate } from "../../../templates/newInquiryEmail";
import type { CreateInquiryInput } from "./inquiries.schema";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

interface InquiryQuery {
  page?: string;
  limit?: string;
  status?: string;
}

export const inquiriesService = {
  async createInquiry(userId: string, data: CreateInquiryInput) {
    // 1. Resolve client record
    const client = await prisma.client.findUnique({
      where: { userId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    if (!client) {
      throw new ApiError(403, "Client profile not found. Please complete setup.");
    }

    // 2. Validate CATALOG items — verify product exists and is active; copy name
    const resolvedItems = await Promise.all(
      data.items.map(async (item) => {
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

    // 3. Generate inquiry number
    const inquiryNumber = await inquiriesRepository.generateInquiryNumber();

    // 4. Create inquiry in DB
    const inquiry = await inquiriesRepository.create({
      inquiryNumber,
      clientId: client.id,
      notes: data.notes,
      items: resolvedItems.map((item) => ({
        type: item.type,
        productId: item.productId,
        productName: item.productName,
        productDescription: item.productDescription,
        quantity: item.quantity,
        unit: item.unit,
        targetPricePerUnit: item.targetPricePerUnit,
        notes: item.notes,
      })),
    });

    // 5. Notify staff/admin via email (fire-and-forget)
    const staffAndAdmins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "STAFF"] }, isActive: true },
      select: { email: true, firstName: true },
    });

    const dashboardUrl = `${FRONTEND_URL}/admin/inquiries/${inquiry.id}`;
    const clientName = `${client.user.firstName} ${client.user.lastName}`;
    const emailHtml = newInquiryEmailTemplate({
      inquiryNumber,
      clientName,
      companyName: client.companyName,
      clientEmail: client.user.email,
      itemCount: inquiry.items.length,
      items: inquiry.items.map((it) => ({
        productName: it.productName,
        type: it.type,
        quantity: it.quantity,
        unit: it.unit,
        targetPricePerUnit: it.targetPricePerUnit?.toString() ?? null,
      })),
      notes: data.notes,
      dashboardUrl,
    });

    for (const staff of staffAndAdmins) {
      sendEmail({
        to: staff.email,
        subject: `New Inquiry: ${inquiryNumber} from ${client.companyName}`,
        html: emailHtml,
      }).catch(() => {
        // swallow email errors — don't fail the request
      });
    }

    return inquiry;
  },

  async getInquiries(query: InquiryQuery, userId: string, role: string) {
    const { page, limit, skip, take } = getPagination(query);
    const status = query.status;

    let clientId: string | undefined;
    if (role === "CLIENT") {
      const client = await prisma.client.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!client) throw ApiError.forbidden("No client profile linked to this account");
      clientId = client.id;
    }

    const [inquiries, total] = await inquiriesRepository.findAll({
      clientId,
      status,
      skip,
      take,
    });

    const pagination = buildPaginationMeta(total, page, limit);
    return { inquiries, pagination };
  },

  async getInquiryById(id: string, userId: string, role: string) {
    let clientId: string | undefined;
    if (role === "CLIENT") {
      const client = await prisma.client.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!client) throw ApiError.forbidden("No client profile linked to this account");
      clientId = client.id;
    }
    return inquiriesRepository.findById(id, clientId);
  },

  async getClientIdByUserId(userId: string): Promise<string | null> {
    const client = await prisma.client.findUnique({
      where: { userId },
      select: { id: true },
    });
    return client?.id ?? null;
  },
};
