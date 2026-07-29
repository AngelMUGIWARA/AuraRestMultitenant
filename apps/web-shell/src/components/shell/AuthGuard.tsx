'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthClient } from '@maison/auth-client';
import { apiClient } from '@maison/api-client';
import { on } from '@maison/event-bus';
import { Skeleton } from '@maison/ui';

const CHANGE_PASSWORD_PATH = '/auth/change-password';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    function hasAllowedRole(): boolean {
      if (!allowedRoles || allowedRoles.length === 0) return true;
      const role = AuthClient.getRole();
      return role !== null && allowedRoles.includes(role);
    }

    // Bloquea el resto de la app hasta que cambie la contraseña temporal —
    // se aplica sin importar el rol (OWNER recién creado por Super Admin,
    // o cualquier usuario invitado con mustChangePassword=true).
    function enforceMustChangePassword(): boolean {
      if (pathname === CHANGE_PASSWORD_PATH) return false;
      if (!AuthClient.mustChangePassword()) return false;
      router.replace(CHANGE_PASSWORD_PATH);
      return true;
    }

    async function check() {
      if (AuthClient.isAuthenticated() && hasAllowedRole()) {
        if (enforceMustChangePassword()) return;
        setChecking(false);
        return;
      }

      const refreshToken = AuthClient.getRefreshToken();
      if (refreshToken) {
        try {
          const data = await apiClient.post<{ accessToken: string; refreshToken?: string }>(
            '/auth/refresh',
            { refreshToken },
          );
          if (cancelled) return;
          AuthClient.setAccessToken(data.accessToken);
          if (data.refreshToken) {
            AuthClient.setRefreshToken(data.refreshToken);
          }
          if (hasAllowedRole()) {
            if (enforceMustChangePassword()) return;
            setChecking(false);
            return;
          }
        } catch {
          if (!cancelled) {
            AuthClient.clearTokens();
          }
        }
      }
      if (!cancelled) router.replace('/auth/login');
      setChecking(false);
    }

    check();

    const offLogout = on('auth:logout', () => {
      setChecking(true);
      router.replace('/auth/login');
    });

    const offLogin = on('auth:login', () => {
      setChecking(true);
    });

    const offExpired = on('auth:session-expired', () => {
      setChecking(true);
      router.replace('/auth/login');
    });

    return () => {
      cancelled = true;
      offLogout();
      offLogin();
      offExpired();
    };
  }, [router, allowedRoles, pathname]);

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col gap-4 p-8 animate-pulse">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  return <>{children}</>;
}
