import { productsRepository } from "./products.repository";
import { getPagination, buildPaginationMeta } from "../../../utils/pagination";
import { ApiError } from "../../../utils/ApiError";

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

  async createProduct(data: Record<string, unknown>) {
    // Auto-generate slug from name if not provided
    if (!data.slug && data.name) {
      data.slug = (data.name as string)
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    }
    return productsRepository.create(data);
  },

  async updateProduct(id: string, data: Record<string, unknown>) {
    const existing = await productsRepository.findById(id).catch(() => null);
    if (!existing) {
      throw ApiError.notFound("Product not found");
    }
    return productsRepository.update(id, data);
  },

  async deleteProduct(id: string) {
    const existing = await productsRepository.findById(id).catch(() => null);
    if (!existing) {
      throw ApiError.notFound("Product not found");
    }
    return productsRepository.softDelete(id);
  },
};
