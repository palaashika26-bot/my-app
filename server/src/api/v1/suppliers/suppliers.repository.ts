import prisma from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";

interface SupplierFilters {
  isVerified?: boolean;
  search?: string;
  skip: number;
  take: number;
}

export const suppliersRepository = {
  async findAll(filters: SupplierFilters) {
    const { isVerified, search, skip, take } = filters;

    const where: Record<string, unknown> = {};

    if (typeof isVerified === "boolean") {
      where.isVerified = isVerified;
    }

    if (search) {
      where.companyName = { contains: search, mode: "insensitive" };
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take,
        include: {
          _count: {
            select: { products: true },
          },
        },
        orderBy: { companyName: "asc" },
      }),
      prisma.supplier.count({ where }),
    ]);

    return [suppliers, total] as const;
  },

  async findById(id: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        products: {
          where: { isActive: true, deletedAt: null },
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            category: true,
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!supplier) {
      throw ApiError.notFound(`Supplier with id "${id}" not found`);
    }

    return supplier;
  },
};
