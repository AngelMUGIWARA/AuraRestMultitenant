'use client';

import { RemoteLoader } from '@/components/shell/RemoteLoader';

export default function ChefPedidosPage() {
  return <RemoteLoader remote="kitchen_mf" module="./App" />;
}
