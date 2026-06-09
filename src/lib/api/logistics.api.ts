import axiosClient, { uploadClient } from './axiosClient';
import type { ApiResponse } from '../types/api.types';

export interface LogisticsListItem {
  id: string;
  requestNumber: string;
  orderRef: string | null;
  weightKg: string | null;
  cbm: string | null;
  shippingMethod: string | null;
  status: 'PENDING' | 'QUOTED' | 'CONFIRMED' | 'IN_TRANSIT' | 'COMPLETED';
  quotePricePerKg: string | null;
  quoteNote: string | null;
  createdAt: string;
  updatedAt: string;
  clientName: string;
  clientEmail: string;
  companyName: string;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface LogisticsMessage {
  id: string;
  senderRole: string;
  senderName: string;
  text: string;
  attachments: string[];
  createdAt: string;
}

export interface LogisticsDetail extends LogisticsListItem {
  packagingList: string[];
  clientUserId: string | null;
  messages: LogisticsMessage[];
}

export interface CreateLogisticsPayload {
  weightKg?: string | null;
  cbm?: string | null;
  shippingMethod?: string | null;
  orderRef?: string | null;
  packagingList?: string[];
  note?: string | null;
}

export const logisticsApi = {
  list: () => axiosClient.get<ApiResponse<LogisticsListItem[]>>('/logistics/requests'),
  get: (id: string) => axiosClient.get<ApiResponse<LogisticsDetail>>(`/logistics/requests/${id}`),
  create: (data: CreateLogisticsPayload) =>
    uploadClient.post<ApiResponse<LogisticsDetail>>('/logistics/requests', data),
  addMessage: (id: string, data: { text?: string; attachments?: string[] }) =>
    uploadClient.post<ApiResponse<LogisticsMessage>>(`/logistics/requests/${id}/messages`, data),
  updateQuote: (id: string, data: { pricePerKg?: string | null; note?: string | null }) =>
    axiosClient.patch<ApiResponse<{ id: string; status: string; quotePricePerKg: string }>>(`/logistics/requests/${id}/quote`, data),
  updateStatus: (id: string, status: string) =>
    axiosClient.patch<ApiResponse<{ id: string; status: string }>>(`/logistics/requests/${id}/status`, { status }),
};
