import prisma from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";

export const categoriesRepository = {
  async findAllWithChildren() {
    return prisma.productCategory.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: true, // 2 levels deep
          },
        },
      },
      orderBy: { name: "asc" },
    });
  },

  async findBySlug(slug: string) {
    const category = await prisma.productCategory.findUnique({
      where: { slug },
      include: {
        children: {
          include: {
            children: true,
          },
        },
        products: {
          where: { isActive: true, deletedAt: null },
          include: {
            supplier: {
              select: { id: true, companyName: true, city: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!category) {
      throw ApiError.notFound(`Category with slug "${slug}" not found`);
    }

    return category;
  },
};
