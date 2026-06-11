import axiosClient, { uploadClient } from './axiosClient';

// Images are uploaded directly to object storage (see src/lib/upload.ts); request
// bodies and responses now carry only short storage URLs, so the standard client
// (30s) is sufficient for reads. Request *creation* still uses the long-timeout
// uploadClient (120s): on a cold-start backend or a slow mobile connection the
// 30s client would abort while the server kept going, creating the row but
// reporting a "network error" to the user (and inviting duplicate submissions).

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
  referenceThumbUrls?: string[];
}

export interface CreateRequestPayload {
  notes?: string;
  referenceNote?: string;
  totalBudgetINR?: number;
  requestType?: 'SOURCING' | 'QUOTATION' | 'SAMPLE';
  items: RequestItemPayload[];
}

export interface SendQuotationPayload {
  items: { id: string; quotedRMB: number }[];
  staffNotes?: string;
  advanceAmountINR?: number;
}

export interface LogisticsPayload {
  weight?: string | null;
  mode?: string | null;
  pricePerKg?: string | null;
  note?: string | null;
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
    uploadClient.post('/requests', data),

  getRequests: (params?: { page?: number; limit?: number; status?: string }, signal?: AbortSignal) =>
    axiosClient.get('/requests', { params, signal }),

  getRequestById: (id: string, signal?: AbortSignal) =>
    axiosClient.get(`/requests/${id}`, { signal }),

  sendQuotation: (id: string, data: SendQuotationPayload) =>
    axiosClient.post(`/requests/${id}/quotation`, data),

  updateLogistics: (id: string, data: LogisticsPayload) =>
    axiosClient.patch(`/requests/${id}/logistics`, data),

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
