'use client';

import { RemoteLoader } from '@/components/shell/RemoteLoader';

export default function AdminPage() {
  return <RemoteLoader remote="dashboard_mf" module="./AdminApp" />;
}
