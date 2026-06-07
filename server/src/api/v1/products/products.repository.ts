import prisma from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";
import { Prisma } from "@prisma/client";

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
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { tags: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
      ];
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

  async create(data: Record<string, unknown>) {
    return prisma.product.create({
      data: data as Prisma.ProductCreateInput,
      include: {
        category: true,
        supplier: true,
      },
    });
  },

  async update(id: string, data: Record<string, unknown>) {
    return prisma.product.update({
      where: { id },
      data: data as Prisma.ProductUpdateInput,
      include: {
        category: true,
        supplier: true,
      },
    });
  },

  async softDelete(id: string) {
    return prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  },
};
