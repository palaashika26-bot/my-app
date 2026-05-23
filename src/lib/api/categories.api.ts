import axiosClient from './axiosClient';
import type { ApiResponse, ApiCategory } from '../types/api.types';

export const categoriesApi = {
  getCategories: () =>
    axiosClient.get<ApiResponse<ApiCategory[]>>('/categories'),

  getCategoryBySlug: (slug: string) =>
    axiosClient.get<ApiResponse<ApiCategory>>(`/categories/${slug}`),
};
