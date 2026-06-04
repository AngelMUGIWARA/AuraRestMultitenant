'use client';

import { RemoteLoader } from '@/components/shell/RemoteLoader';

export default function LoginPage() {
  return <RemoteLoader remote="auth_mf" module="./App" />;
}
