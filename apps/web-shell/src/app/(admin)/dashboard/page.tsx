'use client';

import { RemoteLoader } from '@/components/shell/RemoteLoader';

export default function DashboardPage() {
  return <RemoteLoader remote="dashboard_mf" module="./App" />;
}
