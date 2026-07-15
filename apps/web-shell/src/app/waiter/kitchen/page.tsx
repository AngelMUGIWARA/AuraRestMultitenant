'use client';

import { RemoteLoader } from '@/components/shell/RemoteLoader';

export default function WaiterKitchenPage() {
  return <RemoteLoader remote="kitchen_mf" module="./App" />;
}
