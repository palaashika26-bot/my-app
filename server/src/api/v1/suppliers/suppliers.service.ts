import { suppliersRepository } from "./suppliers.repository";
import { getPagination, buildPaginationMeta } from "../../../utils/pagination";

interface SupplierQuery {
  page?: string;
  limit?: string;
  isVerified?: string;
  search?: string;
}

export const suppliersService = {
  async getSuppliers(query: SupplierQuery) {
    const { page, limit, skip, take } = getPagination(query);

    // Parse isVerified query param: "true" → true, "false" → false, absent → undefined
    let isVerified: boolean | undefined;
    if (query.isVerified === "true") isVerified = true;
    else if (query.isVerified === "false") isVerified = false;

    const [suppliers, total] = await suppliersRepository.findAll({
      isVerified,
      search: query.search,
      skip,
      take,
    });

    const pagination = buildPaginationMeta(total, page, limit);
    return { suppliers, pagination };
  },

  async getSupplierById(id: string) {
    return suppliersRepository.findById(id);
  },
};
