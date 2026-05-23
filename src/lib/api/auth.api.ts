import axiosClient from './axiosClient';
import type { ApiResponse, ApiUser, AuthResponse, LoginPayload, RegisterPayload } from '../types/api.types';

export const authApi = {
  login: (data: LoginPayload) =>
    axiosClient.post<ApiResponse<AuthResponse>>('/auth/login', data),

  register: (data: RegisterPayload) =>
    axiosClient.post<ApiResponse<{ user: ApiUser }>>('/auth/register', data),

  logout: () =>
    axiosClient.post<ApiResponse<null>>('/auth/logout'),

  getMe: () =>
    axiosClient.get<ApiResponse<ApiUser>>('/auth/me'),

  refresh: () =>
    axiosClient.post<ApiResponse<{ accessToken: string }>>('/auth/refresh'),
};
