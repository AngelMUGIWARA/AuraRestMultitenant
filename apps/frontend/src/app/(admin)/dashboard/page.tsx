'use client';

import { RemoteLoader } from '@/components/shell/RemoteLoader';

export default function DashboardPage() {
  return <RemoteLoader remote="mfe_admin" module="./App" />;
}
