import prisma from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";

const itemInclude = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      images: true,
      supplier: { select: { id: true, companyName: true } },
    },
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
};

interface InquiryFilters {
  clientId?: string;
  status?: string;
  skip: number;
  take: number;
}

export const inquiriesRepository = {
  async create(data: {
    inquiryNumber: string;
    clientId: string;
    notes?: string;
    items: {
      type: string;
      productId?: string;
      productName: string;
      productDescription?: string;
      quantity: number;
      unit: string;
      targetPricePerUnit?: number;
      notes?: string;
    }[];
  }) {
    return prisma.inquiry.create({
      data: {
        inquiryNumber: data.inquiryNumber,
        clientId: data.clientId,
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            type: item.type,
            productId: item.productId ?? null,
            productName: item.productName,
            productDescription: item.productDescription,
            quantity: item.quantity,
            unit: item.unit,
            targetPricePerUnit: item.targetPricePerUnit ?? null,
            notes: item.notes,
          })),
        },
      },
      include: fullInclude,
    });
  },

  async findAll(filters: InquiryFilters) {
    const { clientId, status, skip, take } = filters;

    const where: Record<string, unknown> = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;

    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        skip,
        take,
        include: fullInclude,
        orderBy: { createdAt: "desc" },
      }),
      prisma.inquiry.count({ where }),
    ]);

    return [inquiries, total] as const;
  },

  async findById(id: string, clientId?: string) {
    const where: Record<string, unknown> = { id };
    if (clientId) where.clientId = clientId;

    const inquiry = await prisma.inquiry.findFirst({
      where,
      include: fullInclude,
    });

    if (!inquiry) {
      throw ApiError.notFound(`Inquiry not found`);
    }

    return inquiry;
  },

  async generateInquiryNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.inquiry.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    const seq = String(count + 1).padStart(3, "0");
    return `INQ-${year}-${seq}`;
  },
};
