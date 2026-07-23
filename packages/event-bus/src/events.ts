import type { AuthUser, Order, OrderStatus, PaymentMethod, Reservation, ReservationStatus } from '@maison/types';

/**
 * Mapa de eventos del bus. Patrón de nombre: `dominio:accion`.
 * Tipos sin payload usan `undefined`.
 */
export interface MaisonEventMap {
  // ── Auth ──────────────────────────────────────────────────────────────────
  /** Login exitoso — contiene usuario y rol resueltos del token. */
  'auth:login': { user: AuthUser; token: string };
  /** Cierre de sesión (manual o expiración). */
  'auth:logout': undefined;
  /** El token expiró — auth-mf debe intentar refresh. */
  'auth:session-expired': undefined;
  /** Token refrescado exitosamente. */
  'auth:token-refreshed': { token: string };

  // ── Branch / Sucursal ─────────────────────────────────────────────────────
  /** El usuario cambió la sucursal activa. `isGlobal` indica "todas las sucursales". */
  'branch:changed': { branchId: string; branchName: string; isGlobal: boolean };

  // ── Order ─────────────────────────────────────────────────────────────────
  /** cashier-mf creó una nueva orden confirmada. */
  'order:created': { order: Order };
  /** Cambio de estado de una orden (cashier o kitchen). */
  'order:status-changed': { orderId: string; orderNumber: string; status: OrderStatus };
  /** orders-mf o cashier-mf canceló una orden. */
  'order:cancelled': { orderId: string; orderNumber: string; reason?: string };
  /** Actualización general de datos de una orden. */
  'order:updated': { orderId: string };

  // ── Payment ───────────────────────────────────────────────────────────────
  /** cashier-mf completó un cobro. Evento local de UI (browser bus). */
  'payment:completed': { orderId: string; orderNumber: string; methods: PaymentMethod[]; amount: number; paidAmount: number; remainingAmount: number; isFullyPaid: boolean };

  // ── Menu ─────────────────────────────────────────────────────────────────
  /** menu-mf modificó o publicó cambios al catálogo. */
  'menu:updated': { menuItemId?: string; categoryId?: string; branchId?: string };

  // ── Reservation ───────────────────────────────────────────────────────────
  /** reservations-mf creó una nueva reservación. */
  'reservation:created': { reservation: Reservation };
  /** reservations-mf canceló una reservación. */
  'reservation:cancelled': { reservationId: string; confirmationCode: string };

 'reservation:status-changed': { reservationId: string; status: ReservationStatus; };

  // ── Tables ───────────────────────────────────────────────────────────
  'table:status-changed': { tableId: string; status: string };

  // ── Shell / MFE lifecycle ─────────────────────────────────────────────────
  /** Un MFE remoto terminó de montar su árbol React. */
  'mfe:ready': { name: string };

  // ── Navigation ────────────────────────────────────────────────────────────
  /** Solicitud de navegación SPA desde un MFE hacia una ruta del shell. */
  'navigate:to': { path: string; replace?: boolean };
}

export type MaisonEventName = keyof MaisonEventMap;
