'use client';

import { LazyMF } from '@/components/shell/LazyMF';

export default function WaiterOrdersPage() {
  return <LazyMF remote="orders_tables_mf" module="./OrdersApp" />;
}
