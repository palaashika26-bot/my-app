import axiosClient from './axiosClient';
import type { ApiResponse, ApiOrder } from '../types/api.types';

export const ordersApi = {
  getOrders: (params?: { page?: number; limit?: number }) =>
    axiosClient.get<ApiResponse<ApiOrder[]>>('/orders', { params }),

  getOrderById: (id: string) =>
    axiosClient.get<ApiResponse<ApiOrder>>(`/orders/${id}`),
};
