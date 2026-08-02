'use client';

import { LazyMF } from '@/components/shell/LazyMF';

export default function WaiterTablesPage() {
  return <LazyMF remote="orders_tables_mf" module="./TablesApp" />;
}
