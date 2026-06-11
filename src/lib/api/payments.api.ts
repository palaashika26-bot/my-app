import axiosClient from './axiosClient';

export const paymentsApi = {
  submitPayment: (data: {
    orderId: string;
    type: 'ADVANCE' | 'BALANCE';
    amountINR: number;
    proofUrl: string;
    proofThumbUrl?: string;
    proofFileName?: string;
    notes?: string;
  }) => axiosClient.post('/payments', data),

  getOrderPayments: (orderId: string) =>
    axiosClient.get(`/payments/order/${orderId}`),

  verifyPayment: (id: string, action: 'VERIFY' | 'REJECT', rejectionReason?: string) =>
    axiosClient.patch(`/payments/${id}/verify`, { action, rejectionReason }),

  submitRequestPayment: (data: {
    requestId: string;
    type: 'ADVANCE' | 'FULL';
    amountINR: number;
    proofUrl: string;
    proofThumbUrl?: string;
    proofFileName?: string;
    notes?: string;
  }) => axiosClient.post('/payments/request', data),

  getRequestPayments: (requestId: string) =>
    axiosClient.get(`/payments/request/${requestId}`),

  verifyRequestPayment: (id: string, action: 'VERIFY' | 'REJECT', rejectionReason?: string) =>
    axiosClient.patch(`/payments/request/${id}/verify`, { action, rejectionReason }),

  submitLogisticsPayment: (data: {
    logisticsRequestId: string;
    type: 'ADVANCE' | 'FULL';
    amountINR: number;
    proofUrl: string;
    proofThumbUrl?: string;
    proofFileName?: string;
    notes?: string;
  }) => axiosClient.post('/payments/logistics', data),

  getLogisticsPayments: (logisticsId: string) =>
    axiosClient.get(`/payments/logistics/${logisticsId}`),

  verifyLogisticsPayment: (id: string, action: 'VERIFY' | 'REJECT', rejectionReason?: string) =>
    axiosClient.patch(`/payments/logistics/${id}/verify`, { action, rejectionReason }),
};
