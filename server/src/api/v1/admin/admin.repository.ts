import prisma from "../../../config/prisma";

export const adminRepository = {
  async getStats() {
    const [
      totalInquiries,
      pendingInquiries,
      totalOrders,
      activeOrders,
      totalClients,
      pendingPayments,
    ] = await prisma.$transaction([
      prisma.inquiry.count(),
      prisma.inquiry.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { deletedAt: null } }),
      prisma.order.count({
        where: {
          deletedAt: null,
          status: { notIn: ["DELIVERED", "CANCELLED"] },
        },
      }),
      prisma.client.count({ where: { isActive: true } }),
      prisma.order.count({
        where: { deletedAt: null, status: "CONFIRMED" },
      }),
    ]);

    const recentInquiries = await prisma.inquiry.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        inquiryNumber: true,
        status: true,
        createdAt: true,
        items: { select: { productName: true, quantity: true }, take: 1 },
        client: {
          select: {
            companyName: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const recentOrders = await prisma.order.findMany({
      take: 5,
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalINR: true,
        createdAt: true,
        client: {
          select: {
            companyName: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return {
      totalInquiries,
      pendingInquiries,
      totalOrders,
      activeOrders,
      totalClients,
      pendingPayments,
      recentInquiries,
      recentOrders,
    };
  },

  async getClients(params: {
    search?: string;
    isActive?: boolean;
    skip: number;
    take: number;
  }) {
    const where = {
      ...(params.isActive !== undefined && { isActive: params.isActive }),
      ...(params.search && {
        OR: [
          { companyName: { contains: params.search, mode: "insensitive" as const } },
          { user: { email: { contains: params.search, mode: "insensitive" as const } } },
          { user: { firstName: { contains: params.search, mode: "insensitive" as const } } },
          { user: { lastName: { contains: params.search, mode: "insensitive" as const } } },
        ],
      }),
    };

    const [clients, total] = await prisma.$transaction([
      prisma.client.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          companyName: true,
          gstin: true,
          city: true,
          state: true,
          isActive: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          _count: {
            select: { orders: true, inquiries: true },
          },
        },
      }),
      prisma.client.count({ where }),
    ]);

    return { clients, total };
  },

  async getClientById(id: string) {
    return prisma.client.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true,
          },
        },
        orders: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalINR: true,
            createdAt: true,
          },
        },
        inquiries: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            inquiryNumber: true,
            status: true,
            createdAt: true,
            items: { select: { productName: true, quantity: true }, take: 1 },
          },
        },
        _count: { select: { orders: true, inquiries: true } },
      },
    });
  },
};
