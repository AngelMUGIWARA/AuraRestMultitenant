'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthClient } from '@maison/auth-client';

const ROLE_ROUTES: Record<string, string> = {
  OWNER:         '/dashboard',
  ADMIN:         '/admin',
  MANAGER:       '/waiter-orders',
  WAITER:        '/waiter-orders',
  CASHIER:       '/cashier',
  CHEF:          '/kitchen',
  KITCHEN_STAFF: '/kitchen',
};

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (!AuthClient.isAuthenticated()) {
      router.replace('/auth/login');
      return;
    }
    const role = AuthClient.getRole();
    const route = (role && ROLE_ROUTES[role]) ?? '/dashboard';
    router.replace(route);
  }, [router]);

  return null;
}
