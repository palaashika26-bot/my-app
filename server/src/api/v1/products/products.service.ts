import { productsRepository } from "./products.repository";
import { getPagination, buildPaginationMeta } from "../../../utils/pagination";

interface ProductQuery {
  page?: string;
  limit?: string;
  categorySlug?: string;
  supplierId?: string;
  search?: string;
}

export const productsService = {
  async getProducts(query: ProductQuery) {
    const { page, limit, skip, take } = getPagination(query);

    const [products, total] = await productsRepository.findAll({
      categorySlug: query.categorySlug,
      supplierId: query.supplierId,
      search: query.search,
      skip,
      take,
    });

    const pagination = buildPaginationMeta(total, page, limit);
    return { products, pagination };
  },

  async getProductById(id: string) {
    return productsRepository.findById(id);
  },
};
