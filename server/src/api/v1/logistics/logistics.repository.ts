import prisma from "../../../config/prisma";

const clientInclude = {
  client: {
    select: {
      id: true,
      companyName: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
} as const;

export const logisticsRepository = {
  async nextRequestNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.logisticsRequest.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    return `BK-LOG-${year}-${String(count + 1).padStart(4, "0")}`;
  },

  async create(data: {
    requestNumber: string;
    clientId: string;
    orderRef?: string | null;
    weightKg?: string | null;
    cbm?: string | null;
    shippingMethod?: string | null;
    packagingList: string[];
  }) {
    return prisma.logisticsRequest.create({ data });
  },

  async findForList(where: Record<string, unknown>) {
    return prisma.logisticsRequest.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 300,
      include: clientInclude,
    });
  },

  async messageMetaFor(ids: string[]) {
    if (ids.length === 0) return [];
    return prisma.logisticsMessage.findMany({
      where: { logisticsId: { in: ids } },
      select: { logisticsId: true, senderRole: true, createdAt: true },
    });
  },

  async findById(id: string) {
    return prisma.logisticsRequest.findUnique({
      where: { id },
      include: {
        ...clientInclude,
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: { select: { firstName: true, lastName: true, role: true } } },
        },
      },
    });
  },

  async addMessage(data: {
    logisticsId: string;
    senderId: string;
    senderRole: string;
    text: string;
    attachments: string[];
  }) {
    const [message] = await prisma.$transaction([
      prisma.logisticsMessage.create({
        data,
        include: { sender: { select: { firstName: true, lastName: true, role: true } } },
      }),
      prisma.logisticsRequest.update({
        where: { id: data.logisticsId },
        data: { updatedAt: new Date() },
      }),
    ]);
    return message;
  },

  async updateQuote(id: string, data: { quotePricePerKg: number | null; quoteNote: string | null }) {
    return prisma.logisticsRequest.update({
      where: { id },
      data: { quotePricePerKg: data.quotePricePerKg, quoteNote: data.quoteNote, status: "QUOTED" },
    });
  },

  async updateStatus(id: string, status: any) {
    return prisma.logisticsRequest.update({ where: { id }, data: { status } });
  },

  async stampRead(id: string, role: string) {
    const field = role === "CLIENT" ? "clientLastReadAt" : "staffLastReadAt";
    return prisma.logisticsRequest.update({ where: { id }, data: { [field]: new Date() } });
  },
};
