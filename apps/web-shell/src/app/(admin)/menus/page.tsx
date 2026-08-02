'use client';

import { LazyMF } from '@/components/shell/LazyMF';

export default function Page() {
  return <LazyMF remote="orders_tables_mf" module="./TablesApp" />;
}