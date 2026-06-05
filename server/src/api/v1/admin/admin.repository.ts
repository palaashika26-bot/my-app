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

    const [recentInquiries, recentOrders] = await Promise.all([
      prisma.inquiry.findMany({
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
      }),
      prisma.order.findMany({
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
      }),
    ]);

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

  async getStaffUsers(opts?: { includeInactive?: boolean }) {
    return prisma.user.findMany({
      where: {
        role: "STAFF",
        deletedAt: null,
        ...(opts?.includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        staffRole: true,
        isActive: true,
        createdAt: true,
      },
    });
  },

  async findStaffById(id: string) {
    return prisma.user.findFirst({
      where: { id, role: "STAFF", deletedAt: null },
      select: { id: true, isActive: true },
    });
  },

  async findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, select: { id: true } });
  },

  async createStaffUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    phone?: string | null;
    staffRole: string;
  }) {
    return prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash: data.passwordHash,
        phone: data.phone ?? null,
        staffRole: data.staffRole,
        role: "STAFF",
        isActive: true,
        isEmailVerified: true,
        isApproved: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        staffRole: true,
        isActive: true,
        createdAt: true,
      },
    });
  },

  async updateStaffUser(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      staffRole?: string;
      passwordHash?: string;
      isActive?: boolean;
    }
  ) {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        staffRole: true,
        isActive: true,
        createdAt: true,
      },
    });
  },

  async softDeleteStaffUser(id: string) {
    return prisma.user.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
      select: { id: true },
    });
  },

  async findUserByInviteToken(token: string) {
    return prisma.user.findFirst({
      where: { inviteToken: token }
    });
  },

  async activateStaffAccount(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: passwordHash,
        inviteToken: null,
        isActive: true
      }
    });
  },
};