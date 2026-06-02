import axiosClient from './axiosClient';
import type { ApiResponse, PaginationMeta } from '../types/api.types';

export interface ApiSupplier {
  id: string;
  companyName: string;
  city: string | null;
  province: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  isVerified: boolean;
  rating: number | null;
  createdAt: string;
  _count?: { products: number };
}

export const suppliersApi = {
  getSuppliers: (params?: { page?: number; limit?: number; search?: string }) =>
    axiosClient.get<ApiResponse<ApiSupplier[]> & { pagination?: PaginationMeta }>(
      '/suppliers',
      { params }
    ),

  getSupplierById: (id: string) =>
    axiosClient.get<ApiResponse<ApiSupplier>>(`/suppliers/${id}`),
};
