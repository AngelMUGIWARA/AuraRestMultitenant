'use client';

import { LazyMF } from '@/components/shell/LazyMF';

export default function Page() {
  return <LazyMF remote="core_auth_dashboard_mf" module="./AdminApp" />;
}