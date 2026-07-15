'use client';

import { RemoteLoader } from '@/components/shell/RemoteLoader';

export default function WaiterNewOrderPage() {
  return <RemoteLoader remote="orders_mf" module="./App" />;
}
