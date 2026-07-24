'use client';

import { RemoteLoader } from '@/components/shell/RemoteLoader';

export default function ChefReportesPage() {
  return <RemoteLoader remote="reports_mf" module="./App" />;
}
