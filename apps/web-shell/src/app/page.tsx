'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthClient } from '@maison/auth-client';

// redirect() server-only no es compatible con output:'export'.
// Comprobamos sesión en cliente y derivamos a dashboard o login.
export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    if (AuthClient.isAuthenticated()) {
      router.replace('/dashboard');
    } else {
      router.replace('/auth/login');
    }
  }, [router]);
  return null;
}
