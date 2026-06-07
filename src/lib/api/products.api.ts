import axiosClient from './axiosClient';
import type { ApiResponse, ApiProduct } from '../types/api.types';

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  categorySlug?: string;
  supplierId?: string;
}

export interface CreateProductPayload {
  name: string;
  slug?: string;
  description?: string;
  unit?: string;
  moq?: number;
  basePrice: number;
  currency?: string;
  supplierId?: string | null;
  categoryId?: string | null;
  images?: string[];
  videos?: string[];
  brand?: string | null;
  sku?: string | null;
  originCity?: string | null;
  priceRange?: string | null;
  sampleAvailable?: boolean;
  samplePrice?: number | null;
  shortDescription?: string | null;
  fullDescription?: string | null;
  keyFeatures?: string[];
  specifications?: { key: string; value: string }[] | null;
  weight?: string | null;
  material?: string | null;
  tags?: string | null;
  isNew?: boolean;
  onSale?: boolean;
  emoji?: string | null;
  bgColor?: string | null;
  isActive?: boolean;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

export const productsApi = {
  getProducts: (filters?: ProductFilters) =>
    axiosClient.get<ApiResponse<ApiProduct[]>>('/products', { params: filters }),

  getProductById: (id: string) =>
    axiosClient.get<ApiResponse<ApiProduct>>(`/products/${id}`),

  createProduct: (data: CreateProductPayload) =>
    axiosClient.post<ApiResponse<ApiProduct>>('/products', data),

  updateProduct: (id: string, data: UpdateProductPayload) =>
    axiosClient.put<ApiResponse<ApiProduct>>(`/products/${id}`, data),

  deleteProduct: (id: string) =>
    axiosClient.delete<ApiResponse<null>>(`/products/${id}`),
};
