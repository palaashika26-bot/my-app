import axiosClient from './axiosClient';
import type { ApiResponse, ApiOrder } from '../types/api.types';

export const ordersApi = {
  getOrders: (
    params?: { page?: number; limit?: number; status?: string; search?: string },
    signal?: AbortSignal
  ) => axiosClient.get<ApiResponse<ApiOrder[]>>('/orders', { params, signal }),

  getOrderById: (id: string, signal?: AbortSignal) =>
    axiosClient.get<ApiResponse<ApiOrder>>(`/orders/${id}`, { signal }),

  updateOrderStatus: (id: string, status: string) =>
    axiosClient.patch<ApiResponse<{ status: string }>>(`/orders/${id}/status`, { status }),

  // ── Warehouse report (staff/admin) ──────────────────────────────────────────
  getWarehouseReport: (id: string, includePhotos = true, signal?: AbortSignal) =>
    axiosClient.get<ApiResponse<any>>(
      `/orders/${id}/warehouse-report${includePhotos ? '' : '?photos=false'}`,
      { signal },
    ),

  // PATCH partial fields of the warehouse report (item reports, repack details,
  // outbound shipment, etc.). The backend stamps notification flags automatically.
  updateWarehouseReport: (id: string, data: Record<string, unknown>) =>
    axiosClient.patch<ApiResponse<any>>(`/orders/${id}/warehouse-report`, data),

  // Append repacking photos (base64 data URLs); backend caps at 30.
  uploadWarehousePhotos: (id: string, photos: string[], note?: string) =>
    axiosClient.post<ApiResponse<any>>(`/orders/${id}/warehouse-photos`, { photos, note }),
};
