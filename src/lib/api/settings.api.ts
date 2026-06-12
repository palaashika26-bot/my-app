import axiosClient from './axiosClient';

export const settingsApi = {
  // GET /api/v1/settings/exchange-rate → { data: { rate: number } }
  getExchangeRate: (signal?: AbortSignal) =>
    axiosClient.get('/settings/exchange-rate', { signal }),

  // PATCH /api/v1/settings/exchange-rate (admin only)
  updateExchangeRate: (rate: number) =>
    axiosClient.patch('/settings/exchange-rate', { rate }),
};
