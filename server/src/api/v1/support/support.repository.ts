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

export const supportRepository = {
  async nextTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.supportTicket.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    return `BK-TKT-${year}-${String(count + 1).padStart(4, "0")}`;
  },

  async create(data: {
    ticketNumber: string;
    clientId: string;
    subject: string;
    category: string;
    description: string;
    orderId?: string | null;
    priority?: string | null;
  }) {
    return prisma.supportTicket.create({ data });
  },

  // Light list — NO message bodies / attachments. Caller adds unread counts.
  async findForList(where: Record<string, unknown>) {
    return prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 300,
      include: clientInclude,
    });
  },

  // Tiny metadata for every message of the given tickets (for unread + lastMessageAt).
  async messageMetaForTickets(ticketIds: string[]) {
    if (ticketIds.length === 0) return [];
    return prisma.supportTicketMessage.findMany({
      where: { ticketId: { in: ticketIds } },
      select: { ticketId: true, senderRole: true, createdAt: true },
    });
  },

  async findById(id: string) {
    return prisma.supportTicket.findUnique({
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
    ticketId: string;
    senderId: string;
    senderRole: string;
    text: string;
    attachments: string[];
  }) {
    const [message] = await prisma.$transaction([
      prisma.supportTicketMessage.create({
        data,
        include: { sender: { select: { firstName: true, lastName: true, role: true } } },
      }),
      prisma.supportTicket.update({
        where: { id: data.ticketId },
        data: { updatedAt: new Date() },
      }),
    ]);
    return message;
  },

  async updateStatus(id: string, status: any) {
    return prisma.supportTicket.update({ where: { id }, data: { status } });
  },

  async stampRead(id: string, role: string) {
    const field = role === "CLIENT" ? "clientLastReadAt" : "staffLastReadAt";
    return prisma.supportTicket.update({
      where: { id },
      data: { [field]: new Date() },
    });
  },
};
