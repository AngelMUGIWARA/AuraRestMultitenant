'use client';

import { LazyMF } from '@/components/shell/LazyMF';

export default function CashierPOSPage() {
  return <LazyMF remote="cashier_mf" module="./App" lazy={true} />;
}
