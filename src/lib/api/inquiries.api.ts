import axiosClient from './axiosClient';
import type { ApiResponse, ApiInquiry } from '../types/api.types';

export interface InquiryItem {
  type: 'CATALOG' | 'CUSTOM';
  productId?: string;
  productName: string;
  productDescription?: string;
  quantity: number;
  targetPricePerUnit?: number;
  unit: 'PCS' | 'KG' | 'BOX' | 'SET';
  notes?: string;
}

export interface CreateInquiryPayload {
  notes?: string;
  items: InquiryItem[];
}

export const inquiriesApi = {
  createInquiry: (data: CreateInquiryPayload) =>
    axiosClient.post<ApiResponse<ApiInquiry>>('/inquiries', data),

  getInquiries: (params?: { page?: number; limit?: number; status?: string }) =>
    axiosClient.get<ApiResponse<ApiInquiry[]>>('/inquiries', { params }),

  getInquiryById: (id: string) =>
    axiosClient.get<ApiResponse<ApiInquiry>>(`/inquiries/${id}`),
};
