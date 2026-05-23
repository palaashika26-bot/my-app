import axiosClient from './axiosClient';
import type { ApiResponse, ApiProduct } from '../types/api.types';

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  categorySlug?: string;
  supplierId?: string;
}

export const productsApi = {
  getProducts: (filters?: ProductFilters) =>
    axiosClient.get<ApiResponse<ApiProduct[]>>('/products', { params: filters }),

  getProductById: (id: string) =>
    axiosClient.get<ApiResponse<ApiProduct>>(`/products/${id}`),
};
