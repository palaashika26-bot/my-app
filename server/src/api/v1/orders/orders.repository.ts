import prisma from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";

interface OrderFilters {
  clientId?: string;
  skip: number;
  take: number;
}

export const ordersRepository = {
  async findAll(filters: OrderFilters) {
    const { clientId, skip, take } = filters;

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (clientId) {
      where.clientId = clientId;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take,
        include: {
          client: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          items: {
            include: {
              product: true,
            },
          },
          shipment: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count({ where }),
    ]);

    return [orders, total] as const;
  },

  async findById(id: string, clientId?: string) {
    const where: Record<string, unknown> = { id, deletedAt: null };

    if (clientId) {
      where.clientId = clientId;
    }

    const order = await prisma.order.findFirst({
      where,
      include: {
        client: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        items: {
          include: {
            product: true,
            supplier: true,
            qcCheck: true,
          },
        },
        shipment: true,
      },
    });

    if (!order) {
      throw ApiError.notFound(`Order with id "${id}" not found`);
    }

    return order;
  },
};
