'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthClient } from '@maison/auth-client';
import { apiClient } from '@maison/api-client';
import { on } from '@maison/event-bus';
import { Skeleton } from '@maison/ui';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (AuthClient.isAuthenticated()) {
        setAuthenticated(true);
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
          setAuthenticated(true);
        } catch {
          if (!cancelled) {
            AuthClient.clearTokens();
            router.replace('/auth/login');
          }
        }
      } else {
        router.replace('/auth/login');
      }
      setChecking(false);
    }

    check();

    const offLogout = on('auth:logout', () => {
      setAuthenticated(false);
      router.replace('/auth/login');
    });

    const offLogin = on('auth:login', () => {
      setAuthenticated(true);
    });

    const offExpired = on('auth:session-expired', () => {
      setAuthenticated(false);
      router.replace('/auth/login');
    });

    return () => {
      cancelled = true;
      offLogout();
      offLogin();
      offExpired();
    };
  }, [router]);

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

  if (!authenticated) return null;

  return <>{children}</>;
}
