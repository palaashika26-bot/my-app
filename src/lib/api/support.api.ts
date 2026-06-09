import axiosClient, { uploadClient } from './axiosClient';
import type { ApiResponse } from '../types/api.types';

export interface SupportTicketListItem {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: string | null;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
  clientName: string;
  clientEmail: string;
  companyName: string;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface SupportTicketMessage {
  id: string;
  senderRole: string;
  senderName: string;
  text: string;
  attachments: string[];
  createdAt: string;
}

export interface SupportTicketDetail extends SupportTicketListItem {
  description: string;
  clientUserId: string | null;
  messages: SupportTicketMessage[];
}

export interface CreateTicketPayload {
  subject: string;
  category: string;
  description: string;
  orderId?: string | null;
  priority?: string | null;
  attachments?: string[];
}

export const supportApi = {
  list: () => axiosClient.get<ApiResponse<SupportTicketListItem[]>>('/support/tickets'),
  get: (id: string) => axiosClient.get<ApiResponse<SupportTicketDetail>>(`/support/tickets/${id}`),
  create: (data: CreateTicketPayload) =>
    uploadClient.post<ApiResponse<SupportTicketDetail>>('/support/tickets', data),
  addMessage: (id: string, data: { text?: string; attachments?: string[] }) =>
    uploadClient.post<ApiResponse<SupportTicketMessage>>(`/support/tickets/${id}/messages`, data),
  updateStatus: (id: string, status: string) =>
    axiosClient.patch<ApiResponse<{ id: string; status: string }>>(`/support/tickets/${id}/status`, { status }),
};
