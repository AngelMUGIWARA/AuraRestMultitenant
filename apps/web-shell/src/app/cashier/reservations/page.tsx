'use client';

import { LazyMF } from '@/components/shell/LazyMF';

export default function CashierReservationsPage() {
  return <LazyMF remote="reservations_reports_mf" module="./ReservationsApp" />;
}
