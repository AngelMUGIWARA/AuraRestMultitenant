import { apiClient } from './api-client';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type {
  Reservation,
  ReservationStats,
  ReservationFilters,
  CreateReservationPayload,
  ReservationStatus,
} from '@/types/reservation.types';

export const reservationsService = {
  getStats(branchId?: string, date?: string): Promise<ApiResponse<ReservationStats>> {
    return apiClient.get<ApiResponse<ReservationStats>>('/admin/reservations/stats', {
      params: {
        ...(branchId && branchId !== 'global' ? { branchId } : {}),
        ...(date ? { date } : {}),
      },
    });
  },

  getAll(filters?: ReservationFilters): Promise<ApiResponse<PaginatedResponse<Reservation>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<Reservation>>>('/admin/reservations', {
      params: filters as Record<string, string | number | boolean | undefined>,
    });
  },

  getById(id: string): Promise<ApiResponse<Reservation>> {
    return apiClient.get<ApiResponse<Reservation>>(`/admin/reservations/${id}`);
  },

  create(payload: CreateReservationPayload): Promise<ApiResponse<Reservation>> {
    return apiClient.post<ApiResponse<Reservation>>('/admin/reservations', payload);
  },

  updateStatus(id: string, status: ReservationStatus): Promise<ApiResponse<Reservation>> {
    return apiClient.patch<ApiResponse<Reservation>>(`/admin/reservations/${id}/status`, {
      status,
    });
  },

  cancel(id: string, reason?: string): Promise<ApiResponse<void>> {
    return apiClient.patch<ApiResponse<void>>(`/admin/reservations/${id}/cancel`, { reason });
  },
};
