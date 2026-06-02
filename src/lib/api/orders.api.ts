import axiosClient from './axiosClient';
import type { ApiResponse, ApiOrder } from '../types/api.types';

export const ordersApi = {
  getOrders: (params?: { page?: number; limit?: number }, signal?: AbortSignal) =>
    axiosClient.get<ApiResponse<ApiOrder[]>>('/orders', { params, signal }),

  getOrderById: (id: string, signal?: AbortSignal) =>
    axiosClient.get<ApiResponse<ApiOrder>>(`/orders/${id}`, { signal }),

  updateOrderStatus: (id: string, status: string) =>
    axiosClient.patch<ApiResponse<{ status: string }>>(`/orders/${id}/status`, { status }),
};
