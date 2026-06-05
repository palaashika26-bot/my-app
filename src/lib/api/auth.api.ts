import axiosClient from './axiosClient';
import type {
  ApiResponse,
  ApiUser,
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  RegisterClientPayload,
} from '../types/api.types';

export const authApi = {
  login: (data: LoginPayload) =>
    axiosClient.post<ApiResponse<AuthResponse>>('/auth/login', data),

  register: (data: RegisterPayload) =>
    axiosClient.post<ApiResponse<{ user: ApiUser }>>('/auth/register', data),

  registerClient: (data: RegisterClientPayload) =>
    axiosClient.post<ApiResponse<null>>('/auth/register/client', data),

  verifyEmail: (token: string) =>
    axiosClient.get<ApiResponse<null>>(`/auth/verify-email?token=${token}`),

  logout: () =>
    axiosClient.post<ApiResponse<null>>('/auth/logout'),

  getMe: () =>
    axiosClient.get<ApiResponse<ApiUser>>('/auth/me'),

  refresh: () =>
    axiosClient.post<ApiResponse<{ accessToken: string }>>('/auth/refresh'),

  acceptInvite: (data: { token: string; password: string }) =>
    axiosClient.post<ApiResponse<null>>('/auth/accept-invite', data),
};
