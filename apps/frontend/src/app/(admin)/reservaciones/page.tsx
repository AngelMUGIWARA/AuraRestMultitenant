'use client';

import { RemoteLoader } from '@/components/shell/RemoteLoader';

export default function Page() {
  return <RemoteLoader remote="mfe_admin" module="./App" />;
}