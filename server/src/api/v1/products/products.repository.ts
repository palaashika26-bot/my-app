import prisma from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";

interface ProductFilters {
  categorySlug?: string;
  supplierId?: string;
  search?: string;
  skip: number;
  take: number;
}

export const productsRepository = {
  async findAll(filters: ProductFilters) {
    const { categorySlug, supplierId, search, skip, take } = filters;

    const where: Record<string, unknown> = {
      isActive: true,
      deletedAt: null,
    };

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        include: {
          category: true,
          supplier: {
            select: {
              id: true,
              companyName: true,
              city: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    return [products, total] as const;
  },

  async findById(id: string) {
    const product = await prisma.product.findFirst({
      where: {
        id,
        isActive: true,
        deletedAt: null,
      },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        supplier: true,
      },
    });

    if (!product) {
      throw ApiError.notFound(`Product with id "${id}" not found`);
    }

    return product;
  },
};
