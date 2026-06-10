import axiosClient from './axiosClient';

export type ShippingMethod = 'Air' | 'Express' | 'Sea';
export type LogisticsStatus =
  | 'SUBMITTED'
  | 'QUOTED'
  | 'COUNTERED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'CANCELLED';
export type LogisticsPhase = 'AT_WAREHOUSE' | 'FLIGHT_BOOKED' | 'IN_TRANSIT' | 'INDIA_WAREHOUSE';
export type DeliveryMode = 'PICKUP' | 'DELIVERY';

export interface CreateLogisticsPayload {
  shippingMethod: ShippingMethod;
  weightKg?: number;
  volumeCbm?: number;
  packagingListUrls?: string[];
  packagingThumbUrls?: string[];
  note?: string;
}

export interface QuoteLogisticsPayload {
  carrier: string;
  shippingMode: ShippingMethod;
  estimatedPriceINR: number;
  pricePerKgCNY?: number;
  eta?: string;
  quoteNote?: string;
}

export interface RespondLogisticsPayload {
  response: 'ACCEPTED' | 'REJECTED' | 'COUNTERED';
  counterPriceINR?: number;
  counterNote?: string;
}

export interface RespondCounterLogisticsPayload {
  estimatedPriceINR: number;
  pricePerKgCNY?: number;
  carrier?: string;
  shippingMode?: ShippingMethod;
  eta?: string;
  quoteNote?: string;
}

export const logisticsApi = {
  create: (data: CreateLogisticsPayload) => axiosClient.post('/logistics', data),

  getList: (params?: { page?: number; limit?: number; status?: string; view?: string }, signal?: AbortSignal) =>
    axiosClient.get('/logistics', { params, signal }),

  getById: (id: string, signal?: AbortSignal) => axiosClient.get(`/logistics/${id}`, { signal }),

  quote: (id: string, data: QuoteLogisticsPayload) => axiosClient.post(`/logistics/${id}/quote`, data),

  respond: (id: string, data: RespondLogisticsPayload) => axiosClient.post(`/logistics/${id}/respond`, data),

  respondCounter: (id: string, data: RespondCounterLogisticsPayload) =>
    axiosClient.post(`/logistics/${id}/respond-counter`, data),

  updatePhase: (id: string, phase: LogisticsPhase) => axiosClient.patch(`/logistics/${id}/phase`, { phase }),

  setDeliveryMode: (id: string, deliveryMode: DeliveryMode, deliveryAddress?: string) =>
    axiosClient.patch(`/logistics/${id}/delivery-mode`, { deliveryMode, deliveryAddress }),

  uploadSlip: (id: string, warehouseSlipUrl: string, warehouseSlipThumbUrl?: string) =>
    axiosClient.patch(`/logistics/${id}/slip`, { warehouseSlipUrl, warehouseSlipThumbUrl }),

  confirmCargo: (id: string, confirmedBy: string) =>
    axiosClient.post(`/logistics/${id}/cargo-confirm`, { confirmedBy }),

  cancel: (id: string, cancelReason?: string) => axiosClient.patch(`/logistics/${id}/cancel`, { cancelReason }),

  sendMessage: (id: string, text: string) => axiosClient.post(`/logistics/${id}/messages`, { text }),

  getMessages: (id: string, since?: string) =>
    axiosClient.get(`/logistics/${id}/messages`, { params: since ? { since } : {} }),
};

// ── Shared display helpers (used by client + admin + staff pages) ──────────────

export const LOGISTICS_STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  QUOTED: 'bg-[#e4eeee] text-[#6b8f90]',
  COUNTERED: 'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-[#ece9f5] text-[#5c5470]',
  PAYMENT_PENDING: 'bg-orange-100 text-[#c17b5c]',
  CONFIRMED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

export const LOGISTICS_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Pending',
  QUOTED: 'Quoted',
  COUNTERED: 'Counter Sent',
  ACCEPTED: 'Accepted',
  PAYMENT_PENDING: 'Payment Pending',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

// Ordered fulfillment phases for the client tracking timeline (Issue 4).
export const LOGISTICS_PHASES: { id: LogisticsPhase; label: string }[] = [
  { id: 'AT_WAREHOUSE', label: 'At Warehouse' },
  { id: 'FLIGHT_BOOKED', label: 'Flight Booked for India' },
  { id: 'IN_TRANSIT', label: 'In Transit' },
  { id: 'INDIA_WAREHOUSE', label: 'India Warehouse' },
];

export function phaseIndex(phase?: string | null): number {
  return LOGISTICS_PHASES.findIndex((p) => p.id === phase);
}
