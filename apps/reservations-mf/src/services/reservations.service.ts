import { apiClient } from '@maison/api-client';
import type {
  ApiResponse,
  PaginatedResponse,
  Reservation,
  ReservationStats,
  ReservationFilters,
  CreateReservationPayload,
  ReservationStatus, // <-- 1. Importa el tipo estricto del enum
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
    
  arrived: (id: string) =>
    apiClient.patch<ApiResponse<void>>(`/admin/reservations/${id}/arrived`, {}),

  // ─── NUEVA FUNCIÓN CORREGIDA Y TIPADA ─────────────────────────────────────
  updateStatus: (id: string, status: ReservationStatus) =>
    apiClient.patch<ApiResponse<Reservation>>(`/admin/reservations/${id}/status`, { 
      status 
    }),
};