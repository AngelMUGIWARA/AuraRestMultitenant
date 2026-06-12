export type ReservationStatus = 'pending'|'confirmed'|'arrived'|'completed'|'cancelled'|'no_show';
export interface Reservation {
  id: string; confirmationCode: string; guestName: string; guestPhone: string; guestEmail?: string;
  partySize: number; date: string; time: string; durationMinutes: number; status: ReservationStatus;
  tableId?: string; tableName?: string; notes?: string; specialRequests?: string;
  branchId: string; createdAt: string; updatedAt: string;
}
export interface ReservationStats {
  totalToday: number; confirmedToday: number; pendingConfirmation: number; arrivedToday: number;
  completedToday: number; cancelledToday: number; noShowToday: number;
  averagePartySize: number; occupancyRate: number;
}
export interface ReservationFilters { status?: ReservationStatus; date?: string; branchId?: string; search?: string; page?: number; limit?: number; }
export interface CreateReservationPayload { guestName: string; guestPhone: string; guestEmail?: string; partySize: number; date: string; time: string; notes?: string; branchId: string; }
