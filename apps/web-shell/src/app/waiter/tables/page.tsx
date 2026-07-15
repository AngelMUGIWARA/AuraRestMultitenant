'use client';

import { RemoteLoader } from '@/components/shell/RemoteLoader';

export default function WaiterTablesPage() {
  return <RemoteLoader remote="tables_mf" module="./App" />;
}
