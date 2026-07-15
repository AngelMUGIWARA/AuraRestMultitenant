'use client';

import { RemoteLoader } from '@/components/shell/RemoteLoader';

export default function WaiterReservationsPage() {
  return <RemoteLoader remote="reservations_mf" module="./App" />;
}
