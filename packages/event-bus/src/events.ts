import type { AuthUser, Order, OrderStatus, PaymentMethod, Reservation } from '@maison/types';

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
  /** cashier-mf completó un cobro. */
  'payment:completed': { orderId: string; orderNumber: string; method: PaymentMethod; amount: number };

  // ── Menu ─────────────────────────────────────────────────────────────────
  /** menu-mf modificó o publicó cambios al catálogo. */
  'menu:updated': { menuItemId?: string; categoryId?: string; branchId?: string };

  // ── Reservation ───────────────────────────────────────────────────────────
  /** reservations-mf creó una nueva reservación. */
  'reservation:created': { reservation: Reservation };
  /** reservations-mf canceló una reservación. */
  'reservation:cancelled': { reservationId: string; confirmationCode: string };

  // ── Shell / MFE lifecycle ─────────────────────────────────────────────────
  /** Un MFE remoto terminó de montar su árbol React. */
  'mfe:ready': { name: string };
}

export type MaisonEventName = keyof MaisonEventMap;
