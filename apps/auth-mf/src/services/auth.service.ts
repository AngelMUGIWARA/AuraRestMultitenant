import { apiClient } from '@maison/api-client';
import type { LoginPayload, LoginResponse } from '@maison/types';

export const authService = {
  login: (payload: LoginPayload) =>
    apiClient.post<LoginResponse>('/auth/login', payload),

  logout: () =>
    apiClient.post<void>('/auth/logout', {}),

  refreshToken: (refreshToken: string) =>
    apiClient.post<{ accessToken: string }>('/auth/refresh', { refreshToken }),

  forgotPassword: (email: string) =>
    apiClient.post<void>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    apiClient.post<void>('/auth/reset-password', { token, password }),
};
