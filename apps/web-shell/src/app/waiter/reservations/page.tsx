'use client';

import { LazyMF } from '@/components/shell/LazyMF';

export default function WaiterReservationsPage() {
  return <LazyMF remote="reservations_reports_mf" module="./ReservationsApp" />;
}
