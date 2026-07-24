'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthClient } from '@maison/auth-client';
import { ROLE_ROUTES } from '@/lib/constants';

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
