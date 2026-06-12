import { apiClient } from '@maison/api-client';
import type {
  ApiResponse,
  PaginatedResponse,
  Reservation,
  ReservationStats,
  ReservationFilters,
  CreateReservationPayload,
} from '@maison/types';

export const reservationsService = {
  getStats: (branchId?: string) =>
    apiClient.get<ApiResponse<ReservationStats>>('/admin/reservations/stats', {
      params: { branchId },
    }),
  getAll: (filters?: ReservationFilters) =>
    apiClient.get<ApiResponse<PaginatedResponse<Reservation>>>('/admin/reservations', {
      params: filters as Record<string, string | number | boolean | undefined>,
    }),
  getById: (id: string) =>
    apiClient.get<ApiResponse<Reservation>>(`/admin/reservations/${id}`),
  create: (payload: CreateReservationPayload) =>
    apiClient.post<ApiResponse<Reservation>>('/admin/reservations', payload),
  confirm: (id: string) =>
    apiClient.patch<ApiResponse<void>>(`/admin/reservations/${id}/confirm`, {}),
  cancel: (id: string, reason?: string) =>
    apiClient.patch<ApiResponse<void>>(`/admin/reservations/${id}/cancel`, { reason }),
  markArrived: (id: string) =>
    apiClient.patch<ApiResponse<void>>(`/admin/reservations/${id}/arrived`, {}),
};
