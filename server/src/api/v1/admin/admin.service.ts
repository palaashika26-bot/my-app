import { adminRepository } from "./admin.repository";
import { getPagination, buildPaginationMeta } from "../../../utils/pagination";

interface ClientsQuery {
  page?: string;
  limit?: string;
  search?: string;
  isActive?: string;
}

export const adminService = {
  async getStats() {
    return adminRepository.getStats();
  },

  async getClients(query: ClientsQuery) {
    const { page, limit, skip, take } = getPagination(query);

    const isActive =
      query.isActive === "true"
        ? true
        : query.isActive === "false"
        ? false
        : undefined;

    const { clients, total } = await adminRepository.getClients({
      search: query.search,
      isActive,
      skip,
      take,
    });

    const pagination = buildPaginationMeta(total, page, limit);
    return { clients, pagination };
  },

  async getClientById(id: string) {
    return adminRepository.getClientById(id);
  },
};
