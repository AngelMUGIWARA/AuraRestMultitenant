'use client';

import { RemoteLoader } from '@/components/shell/RemoteLoader';

export default function Page() {
  return <RemoteLoader remote="orders_mf" module="./App" />;
}
