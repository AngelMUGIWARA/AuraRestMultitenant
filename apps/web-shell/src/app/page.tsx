'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthClient } from '@maison/auth-client';
import { ROLE_ROUTES } from '@/lib/constants';
import { LandingPage } from '@/components/landing/LandingPage';

export default function RootPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (AuthClient.isAuthenticated()) {
      const role = AuthClient.getRole();
      const route = (role && ROLE_ROUTES[role]) ?? '/dashboard';
      router.replace(route);
      return;
    }
    setCheckingSession(false);
  }, [router]);

  // Mientras se confirma la sesión no se renderiza nada, para no mostrar
  // la landing por un instante a un usuario que ya tiene sesión iniciada.
  if (checkingSession) return null;

  return <LandingPage />;
}
