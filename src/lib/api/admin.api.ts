import axiosClient from './axiosClient';
import type { ApiResponse, PaginationMeta } from '../types/api.types';

export interface AdminStats {
  totalInquiries: number;
  pendingInquiries: number;
  totalOrders: number;
  activeOrders: number;
  totalClients: number;
  pendingPayments: number;
  monthlyRevenue: { month: string; revenue: number }[];
  ordersByStatus: { name: string; value: number; color: string }[];
  recentInquiries: {
    id: string;
    inquiryNumber: string;
    status: string;
    createdAt: string;
    items: { productName: string; quantity: number }[];
    client: {
      companyName: string;
      user: { firstName: string; lastName: string };
    };
  }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    status: string;
    totalINR: string;
    createdAt: string;
    client: {
      companyName: string;
      user: { firstName: string; lastName: string };
    };
  }[];
}

export interface AdminClient {
  id: string;
  companyName: string;
  gstin: string | null;
  city: string | null;
  state: string | null;
  isActive: boolean;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  _count: { orders: number; inquiries: number };
}

export interface AdminClientDetail extends AdminClient {
  orders: {
    id: string;
    orderNumber: string;
    status: string;
    totalINR: string;
    createdAt: string;
  }[];
  inquiries: {
    id: string;
    quantity: number;
    status: string;
    createdAt: string;
    product: { name: string } | null;
  }[];
}

export interface ClientsParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface StaffMemberApi {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  staffRole: string | null;
  isActive: boolean;
  createdAt: string;
}

export const adminApi = {
  getStats: () =>
    axiosClient.get<ApiResponse<AdminStats>>('/admin/stats'),

  getClients: (params?: ClientsParams) =>
    axiosClient.get<ApiResponse<AdminClient[]> & { pagination: PaginationMeta }>(
      '/admin/clients',
      { params }
    ),

  getClientById: (id: string) =>
    axiosClient.get<ApiResponse<AdminClientDetail>>(`/admin/clients/${id}`),

  listStaff: () =>
    axiosClient.get<ApiResponse<StaffMemberApi[]>>('/admin/staff', { params: { includeInactive: true } }),

  createStaff: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    staffRole: string;
  }) => axiosClient.post<ApiResponse<StaffMemberApi>>('/admin/staff', data),

  updateStaff: (
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      staffRole?: string;
      password?: string;
      isActive?: boolean;
    }
  ) => axiosClient.patch<ApiResponse<StaffMemberApi>>(`/admin/staff/${id}`, data),

  deleteStaff: (id: string) =>
    axiosClient.delete<ApiResponse<{ id: string }>>(`/admin/staff/${id}`),
};
