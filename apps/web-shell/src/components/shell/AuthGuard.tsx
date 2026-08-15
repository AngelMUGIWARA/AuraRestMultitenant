'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthClient } from '@maison/auth-client';
import { apiClient } from '@maison/api-client';
import { on } from '@maison/event-bus';
import { Skeleton } from '@maison/ui';
import { canAccessRoute, getDefaultRouteForRole } from '@/lib/auth-config';

const CHANGE_PASSWORD_PATH = '/auth/change-password';
const AUTH_TIMEOUT = 10000;    // ✅ 10 segundos timeout
const RETRY_ATTEMPTS = 3;       // ✅ Reintentar 3 veces
const RETRY_DELAYS = [500, 1000, 2000]; // ms entre reintentos

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: NodeJS.Timeout | null = null;

    function hasAllowedRole(): boolean {
      const role = AuthClient.getRole();

      // Usar matriz centralizada de autorización
      if (!canAccessRoute(pathname, role)) {
        return false;
      }

      // Soporte para allowedRoles heredado
      if (allowedRoles && allowedRoles.length > 0) {
        return role !== null && allowedRoles.includes(role);
      }

      return true;
    }

    function enforceMustChangePassword(): boolean {
      if (pathname === CHANGE_PASSWORD_PATH) return false;
      if (!AuthClient.mustChangePassword()) return false;
      router.replace(CHANGE_PASSWORD_PATH);
      return true;
    }

    // ✅ Función con retry automático
    async function refreshWithRetry(attempt = 1): Promise<boolean> {
      const refreshToken = AuthClient.getRefreshToken();
      if (!refreshToken) return false;

      try {
        // ✅ Crear AbortController con timeout
        const controller = new AbortController();
        timeoutId = setTimeout(() => {
          controller.abort();
        }, AUTH_TIMEOUT);

        const data = await apiClient.post<{ accessToken: string; refreshToken?: string }>(
          '/auth/refresh',
          { refreshToken },
        );

        if (timeoutId) clearTimeout(timeoutId);
        if (cancelled) return false;

        AuthClient.setAccessToken(data.accessToken);
        if (data.refreshToken) {
          AuthClient.setRefreshToken(data.refreshToken);
        }
        return true;
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);

        // ✅ Retry con backoff exponencial
        if (attempt < RETRY_ATTEMPTS && !cancelled) {
          const delay = RETRY_DELAYS[attempt - 1] || 2000;
          console.warn(
            `Auth refresh falló (intento ${attempt}/${RETRY_ATTEMPTS}), reintentando en ${delay}ms...`
          );

          await new Promise(resolve => {
            timeoutId = setTimeout(resolve, delay);
          });

          if (!cancelled) {
            return refreshWithRetry(attempt + 1);
          }
        }

        if (!cancelled) {
          AuthClient.clearTokens();
          if (attempt >= RETRY_ATTEMPTS) {
            setError(`Error de autenticación después de ${RETRY_ATTEMPTS} intentos`);
          }
        }
        return false;
      }
    }

    async function check() {
      try {
        // ✅ Comprobar si ya está autenticado
        if (AuthClient.isAuthenticated() && hasAllowedRole()) {
          if (enforceMustChangePassword()) return;
          setChecking(false);
          setError(null);
          return;
        }

        // ✅ Intentar refrescar token con retry
        const refreshed = await refreshWithRetry(1);
        if (cancelled) return;

        if (refreshed && hasAllowedRole()) {
          if (enforceMustChangePassword()) return;
          setChecking(false);
          setError(null);
          return;
        }

        // ✅ Si todo falla, redirigir según rol o a login
        if (!cancelled) {
          const role = AuthClient.getRole();
          if (role && !canAccessRoute(pathname, role)) {
            // Usuario autenticado pero sin permisos para esta ruta
            router.replace(getDefaultRouteForRole(role));
          } else {
            // No autenticado
            router.replace('/auth/login');
          }
          setChecking(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Error inesperado en autenticación');
          setChecking(false);
        }
      }
    }

    check();

    const offLogout = on('auth:logout', () => {
      setChecking(true);
      setError(null);
      router.replace('/auth/login');
    });

    const offLogin = on('auth:login', () => {
      setChecking(true);
      setError(null);
    });

    const offExpired = on('auth:session-expired', () => {
      setChecking(true);
      setError('Sesión expirada');
      router.replace('/auth/login');
    });

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      offLogout();
      offLogin();
      offExpired();
    };
  }, [router, allowedRoles, pathname]);

  // ✅ Mostrar error en lugar de skeleton infinito
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center space-y-4">
          <p className="text-sm font-medium text-maison-ruby">{error}</p>
          <p className="text-xs text-maison-cream-muted">Redirigiendo a login...</p>
        </div>
      </div>
    );
  }

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
