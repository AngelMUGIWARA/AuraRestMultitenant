'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthClient } from '@maison/auth-client';
import { LazyMF } from '@/components/shell/LazyMF';
import { ROLE_ROUTES } from '@/lib/constants';

export default function SucursalesPage() {
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
  return <LazyMF remote="core_auth_dashboard_mf" module="./DashboardApp" />;
}
