import { ordersRepository } from "./orders.repository";
import { getPagination, buildPaginationMeta } from "../../../utils/pagination";
import prisma from "../../../config/prisma";

interface OrderQuery {
  page?: string;
  limit?: string;
}

export const ordersService = {
  async getOrders(
    query: OrderQuery,
    clientId?: string,
    filters?: { statuses?: string[]; displayStatus?: string; search?: string }
  ) {
    const { page, limit, skip, take } = getPagination(query);

    const [orders, total] = await ordersRepository.findAll({
      clientId,
      statuses: filters?.statuses,
      displayStatus: filters?.displayStatus,
      search: filters?.search,
      skip,
      take,
    });

    const pagination = buildPaginationMeta(total, page, limit);
    return { orders, pagination };
  },

  async getOrderById(id: string, clientId?: string) {
    return ordersRepository.findById(id, clientId);
  },

  async getGSTInvoice(orderId: string) {
    return ordersRepository.getGSTInvoice(orderId);
  },

  async saveGSTInvoice(orderId: string, gstData: Record<string, unknown>) {
    return ordersRepository.saveGSTInvoice(orderId, gstData);
  },

  async updateCompletedStages(id: string, completedStages: string[]) {
    return ordersRepository.updateCompletedStages(id, completedStages);
  },

  async updateStatus(id: string, status: string) {
    return ordersRepository.updateStatus(id, status);
  },

  async updateDeliveryPreference(id: string, deliveryPreference: string, deliveryAddress?: string) {
    return ordersRepository.updateDeliveryPreference(id, deliveryPreference, deliveryAddress);
  },

  async getWarehouseReport(orderId: string, clientId?: string) {
    return ordersRepository.getWarehouseReport(orderId, clientId);
  },

  async upsertWarehouseReport(orderId: string, data: Record<string, unknown>) {
    return ordersRepository.upsertWarehouseReport(orderId, data);
  },

  async appendAdminReply(orderId: string, reply: Record<string, unknown>) {
    return ordersRepository.appendAdminReply(orderId, reply);
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
