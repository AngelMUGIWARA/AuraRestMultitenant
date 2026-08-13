'use client';

import { LazyMF } from '@/components/shell/LazyMF';

export default function ChefPedidosPage() {
  return <LazyMF remote="kitchen_mf" module="./App" lazy={true} />;
}
