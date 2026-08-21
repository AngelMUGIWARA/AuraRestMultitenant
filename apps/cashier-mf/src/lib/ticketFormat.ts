/** Dynamic values entering the ticket generator may arrive as string, number,
 * null or undefined (e.g. a Decimal serialized inconsistently upstream).
 * Every formatter here normalizes defensively instead of assuming a type.
 * Shared between the on-screen preview (TicketPrintView, JSX) and the
 * isolated print document (ticketDocument, plain HTML string) so both
 * always render identical data. */
export type Numeric = number | string | null | undefined;

export function toSafeNumber(value: Numeric): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function toSafeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value);
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtTime(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export function fmtCurrency(value: Numeric): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(
    toSafeNumber(value),
  );
}

export const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  qr: 'Código QR',
  other: 'Otro',
};

export const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Para aquí',
  takeaway: 'Para llevar',
  delivery: 'Delivery',
};

/** Escapes text for safe interpolation into a raw (non-JSX) HTML string —
 * needed only by ticketDocument.tsx, which builds markup by hand instead of
 * relying on JSX's automatic escaping. */
export function escapeHtml(value: unknown): string {
  return toSafeString(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
