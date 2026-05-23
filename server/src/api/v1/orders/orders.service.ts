import { ordersRepository } from "./orders.repository";
import { getPagination, buildPaginationMeta } from "../../../utils/pagination";
import prisma from "../../../config/prisma";

interface OrderQuery {
  page?: string;
  limit?: string;
}

export const ordersService = {
  async getOrders(query: OrderQuery, clientId?: string) {
    const { page, limit, skip, take } = getPagination(query);

    const [orders, total] = await ordersRepository.findAll({
      clientId,
      skip,
      take,
    });

    const pagination = buildPaginationMeta(total, page, limit);
    return { orders, pagination };
  },

  async getOrderById(id: string, clientId?: string) {
    return ordersRepository.findById(id, clientId);
  },

  /** Resolve the Client.id for a given User.id (used by CLIENT role controllers) */
  async getClientIdByUserId(userId: string): Promise<string | null> {
    const client = await prisma.client.findUnique({
      where: { userId },
      select: { id: true },
    });
    return client?.id ?? null;
  },
};
