import { apiClient } from '@maison/api-client';
import type {
  ApiResponse,
  PaginatedResponse,
  Reservation,
  ReservationStats,
  ReservationFilters,
  CreateReservationPayload,
  ReservationStatus,
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

  /**
   * Confirma una reserva (transición PENDING → CONFIRMED)
   */
  confirm: (id: string) =>
    reservationsService.updateStatus(id, 'CONFIRMED'),

  /**
   * Cancela una reserva (transición a CANCELLED)
   */
  cancel: (id: string) =>
    reservationsService.updateStatus(id, 'CANCELLED'),

  /**
   * Marca como llegada (transición CONFIRMED → ARRIVED)
   */
  arrived: (id: string) =>
    reservationsService.updateStatus(id, 'ARRIVED'),

  /**
   * Marca como completada (transición ARRIVED → COMPLETED)
   */
  complete: (id: string) =>
    reservationsService.updateStatus(id, 'COMPLETED'),

  /**
   * Marca como no-show (transición CONFIRMED → NO_SHOW)
   */
  markNoShow: (id: string) =>
    reservationsService.updateStatus(id, 'NO_SHOW'),

  /**
   * Actualiza el estado de una reserva
   * Todos los cambios de estado van a través de este endpoint
   */
  updateStatus: (id: string, status: ReservationStatus) =>
    apiClient.patch<ApiResponse<Reservation>>(`/admin/reservations/${id}/status`, {
      status,
    }),
};
