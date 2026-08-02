'use client';

import { LazyMF } from '@/components/shell/LazyMF';

export default function WaiterNewOrderPage() {
  return <LazyMF remote="orders_tables_mf" module="./OrdersApp" />;
}
