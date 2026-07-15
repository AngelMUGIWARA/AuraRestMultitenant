'use client';

import { RemoteLoader } from '@/components/shell/RemoteLoader';

export default function WaiterOrdersPage() {
  return <RemoteLoader remote="orders_mf" module="./App" />;
}
