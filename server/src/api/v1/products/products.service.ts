import { productsRepository } from "./products.repository";
import { getPagination, buildPaginationMeta } from "../../../utils/pagination";
import { ApiError } from "../../../utils/ApiError";
import { signImageFields, normalizeStoragePathFields } from "../../../config/storage";

const MEDIA_FIELDS = ["images", "videos"];

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
    // Convert storage-path media to signed read URLs (legacy base64/external pass through).
    await signImageFields(products, { arrays: MEDIA_FIELDS });
    return { products, pagination };
  },

  async getProductById(id: string) {
    const product = await productsRepository.findById(id);
    await signImageFields(product, { arrays: MEDIA_FIELDS });
    return product;
  },

  async createProduct(data: Record<string, unknown>) {
    // Auto-generate slug from name if not provided
    if (!data.slug && data.name) {
      data.slug = (data.name as string)
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    }
    // An admin form may resubmit signed URLs it was shown — store raw paths only.
    normalizeStoragePathFields(data, MEDIA_FIELDS);
    return productsRepository.create(data);
  },

  async updateProduct(id: string, data: Record<string, unknown>) {
    const existing = await productsRepository.findById(id).catch(() => null);
    if (!existing) {
      throw ApiError.notFound("Product not found");
    }
    normalizeStoragePathFields(data, MEDIA_FIELDS);
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
