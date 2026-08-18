'use client';

import { LazyMF } from '@/components/shell/LazyMF';

export default function CashierOrdersPage() {
  return <LazyMF remote="orders_tables_mf" module="./OrdersApp" />;
}
