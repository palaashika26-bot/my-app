import axiosClient from './axiosClient';

export interface RequestItemPayload {
  type: 'CATALOG' | 'CUSTOM';
  productId?: string;
  productName: string;
  productDescription?: string;
  quantity: number;
  unit: 'PCS' | 'KG' | 'BOX' | 'SET';
  targetPriceINR?: number;
  notes?: string;
  referenceImageUrls?: string[];
}

export interface CreateRequestPayload {
  notes?: string;
  referenceNote?: string;
  totalBudgetINR?: number;
  items: RequestItemPayload[];
}

export interface SendQuotationPayload {
  items: { id: string; quotedRMB: number }[];
  staffNotes?: string;
  advanceAmountINR?: number;
}

export interface RespondItemPayload {
  id: string;
  response: 'ACCEPTED' | 'REJECTED' | 'COUNTERED';
  counterPriceINR?: number;
  counterNote?: string;
}

export interface RespondToCounterItemPayload {
  id: string;
  newQuotedRMB: number;
}

export const requestsApi = {
  createRequest: (data: CreateRequestPayload) =>
    axiosClient.post('/requests', data),

  getRequests: (params?: { page?: number; limit?: number; status?: string }, signal?: AbortSignal) =>
    axiosClient.get('/requests', { params, signal }),

  getRequestById: (id: string, signal?: AbortSignal) =>
    axiosClient.get(`/requests/${id}`, { signal }),

  sendQuotation: (id: string, data: SendQuotationPayload) =>
    axiosClient.post(`/requests/${id}/quotation`, data),

  approveRequest: (id: string) =>
    axiosClient.post(`/requests/${id}/approve`),

  rejectRequest: (id: string, reason?: string) =>
    axiosClient.post(`/requests/${id}/reject`, { reason }),

  respondToQuotation: (id: string, items: RespondItemPayload[]) =>
    axiosClient.post(`/requests/${id}/respond`, { items }),

  respondToCounter: (id: string, items: RespondToCounterItemPayload[]) =>
    axiosClient.post(`/requests/${id}/respond-counter`, { items }),

  sendMessage: (id: string, text: string) =>
    axiosClient.post(`/requests/${id}/messages`, { text }),

  getMessages: (id: string, since?: string) =>
    axiosClient.get(`/requests/${id}/messages`, { params: since ? { since } : {} }),
};
