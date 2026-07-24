'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthClient } from '@maison/auth-client';
import { RemoteLoader } from '@/components/shell/RemoteLoader';
import { ROLE_ROUTES } from '@/lib/constants';

export default function DashboardPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const role = AuthClient.getRole();
    if (role !== 'OWNER') {
      router.replace((role && ROLE_ROUTES[role]) ?? '/admin');
      return;
    }
    setAllowed(true);
  }, [router]);

  if (!allowed) return null;
  return <RemoteLoader remote="dashboard_mf" module="./App" />;
}
