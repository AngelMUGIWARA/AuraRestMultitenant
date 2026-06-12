import { apiClient } from '@maison/api-client';
import type { ApiResponse, PaginatedResponse } from '@maison/types';
import type { Reservation, ReservationStats, ReservationFilters, CreateReservationPayload, ReservationStatus } from '../types/reservation.types';
export const reservationsService = {
  getStats: (branchId?: string, date?: string) => apiClient.get<ApiResponse<ReservationStats>>('/admin/reservations/stats', { params: { ...(branchId && branchId !== 'global' ? { branchId } : {}), ...(date ? { date } : {}) } }),
  getAll: (filters?: ReservationFilters) => apiClient.get<ApiResponse<PaginatedResponse<Reservation>>>('/admin/reservations', { params: filters as Record<string, string | number | boolean | undefined> }),
  getById: (id: string) => apiClient.get<ApiResponse<Reservation>>(`/admin/reservations/${id}`),
  create: (payload: CreateReservationPayload) => apiClient.post<ApiResponse<Reservation>>('/admin/reservations', payload),
  updateStatus: (id: string, status: ReservationStatus) => apiClient.patch<ApiResponse<Reservation>>(`/admin/reservations/${id}/status`, { status }),
  cancel: (id: string, reason?: string) => apiClient.patch<ApiResponse<void>>(`/admin/reservations/${id}/cancel`, { reason }),
};
