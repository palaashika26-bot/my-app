import axiosClient from './axiosClient';
import type { ApiResponse } from '../types/api.types';

export interface ApiNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  relatedType: string | null;
  relatedId: string | null;
  read: boolean;
  createdAt: string;
}

export const notificationsApi = {
  getNotifications: (params?: { limit?: number }) =>
    axiosClient.get<ApiResponse<ApiNotification[]>>('/notifications', { params }),

  markAsRead: (id: string) =>
    axiosClient.patch<ApiResponse<null>>(`/notifications/${id}/read`),

  markAllAsRead: () =>
    axiosClient.patch<ApiResponse<null>>('/notifications/read-all'),
};
