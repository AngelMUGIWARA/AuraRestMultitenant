export function mapOrderStatusToDb(status: string): string {
  const map: Record<string, string> = {
    pending: 'PENDING',
    confirmed: 'CONFIRMED',
    preparing: 'IN_PROGRESS',
    ready: 'READY',
    delivered: 'DELIVERED',
    paid: 'PAID',
    cancelled: 'CANCELLED',
  };
  return map[status] ?? status;
}

export function mapOrderStatusFromDb(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    IN_PROGRESS: 'preparing',
    READY: 'ready',
    DELIVERED: 'delivered',
    PAID: 'paid',
    CANCELLED: 'cancelled',
  };
  return map[status] ?? status;
}

export function mapPaymentMethodToDb(method: string): string {
  const map: Record<string, string> = {
    cash: 'CASH',
    card: 'CARD',
    qr: 'QR',
    transfer: 'TRANSFER',
    other: 'OTHER',
  };
  return map[method] ?? method;
}

export function mapPaymentMethodFromDb(method: string): string {
  const map: Record<string, string> = {
    CASH: 'cash',
    CARD: 'card',
    QR: 'qr',
    TRANSFER: 'transfer',
    OTHER: 'other',
  };
  return map[method] ?? method;
}

export function mapPaymentStatusToDb(status: string): string {
  const map: Record<string, string> = {
    pending: 'PENDING',
    paid: 'COMPLETED',
    completed: 'COMPLETED',
    refunded: 'REFUNDED',
    failed: 'FAILED',
  };
  return map[status] ?? status;
}

export function mapPaymentStatusFromDb(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'pending',
    COMPLETED: 'paid',
    REFUNDED: 'refunded',
    FAILED: 'failed',
  };
  return map[status] ?? status;
}
