'use client';

import { LazyMF } from '@/components/shell/LazyMF';

export default function WaiterKitchenPage() {
  return <LazyMF remote="kitchen_mf" module="./App" lazy={true} />;
}
