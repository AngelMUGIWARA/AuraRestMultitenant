'use client';

import { LazyMF } from '@/components/shell/LazyMF';

export default function Page() {
  return <LazyMF remote="menu_mf" module="./App" lazy={true} />;
}