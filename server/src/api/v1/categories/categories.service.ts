import { categoriesRepository } from "./categories.repository";

export const categoriesService = {
  async getCategories() {
    return categoriesRepository.findAllWithChildren();
  },

  async getCategoryBySlug(slug: string) {
    return categoriesRepository.findBySlug(slug);
  },
};
