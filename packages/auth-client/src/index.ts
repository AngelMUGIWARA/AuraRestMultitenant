import type { AuthUser, AuthTokenPayload } from '@maison/types';
import { emit } from '@maison/event-bus';

const TOKEN_KEY = 'maison_access_token';
const REFRESH_KEY = 'maison_refresh_token';

function parseJwt(token: string): AuthTokenPayload | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload)) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export const AuthClient = {
  // ── Token management ────────────────────────────────────────────────────

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_KEY);
  },

  setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(REFRESH_KEY, token);
  },

  /** Alias for getToken */
  getAccessToken(): string | null {
    return this.getToken();
  },

  /** Alias for setToken */
  setAccessToken(token: string): void {
    this.setToken(token);
  },

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },

  /**
   * Realiza logout completo: limpia tokens, estado local y emite evento global.
   * Todos los microfrontends escuchan 'auth:logout' y limpian su propio estado.
   * @param apiLogout - Si true, también notifica al backend (opcional)
   */
  async logout(apiLogout = false): Promise<void> {
    if (typeof window === 'undefined') return;

    // Opcionalmente, notificar al backend (ej. para invalidar refresh token en blacklist)
    if (apiLogout) {
      try {
        const rt = this.getRefreshToken();
        // No esperar a que responda, limpiamos de todas formas
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt ?? '' }),
        }).catch(() => {});
      } catch {
        // Ignorar errores de API
      }
    }

    // 1. Limpiar tokens
    this.clearTokens();

    // 2. Limpiar otros datos de sesión del localStorage que pudieran estar en el app
    // (branch seleccionada, preferencias, caché del usuario, etc.)
    localStorage.removeItem('maison_branch_id');
    localStorage.removeItem('maison_branch_name');
    localStorage.removeItem('maison_tenant_slug');
    localStorage.removeItem('maison_sidebar_collapsed');
    localStorage.removeItem('maison_session_id');

    // 3. Emitir evento global para que todos los MFEs limpien su estado
    // Esto también dispara el evento en AuthGuard que redirige a /login
    emit('auth:logout', undefined);
  },

  // ── Session state ────────────────────────────────────────────────────────

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    const payload = parseJwt(token);
    if (!payload) return false;
    // Check expiry with a 30s buffer
    return payload.exp * 1000 > Date.now() + 30_000;
  },

  isTokenExpired(): boolean {
    return !this.isAuthenticated();
  },

  getUser(): AuthUser | null {
    const token = this.getToken();
    if (!token) return null;
    const payload = parseJwt(token);
    if (!payload) return null;
    return {
      id: payload.sub,
      name: '',
      email: payload.email,
      role: payload.role as AuthUser['role'],
      branchId: payload.branchId,
      tenantId: payload.tenantId,
    };
  },

  getRole(): string | null {
    const token = this.getToken();
    if (!token) return null;
    const payload = parseJwt(token);
    return payload?.role ?? null;
  },

  getTenantSlug(): string | null {
    const token = this.getToken();
    if (!token) return null;
    const payload = parseJwt(token);
    return (payload?.tenantSlug as string | undefined) ?? null;
  },

  /** true si el usuario debe cambiar su contraseña antes de usar el resto de la app. */
  mustChangePassword(): boolean {
    const token = this.getToken();
    if (!token) return false;
    const payload = parseJwt(token);
    return payload?.mustChangePassword ?? false;
  },

  /** Returns Authorization header value or null if not authenticated. */
  getAuthHeader(): string | null {
    const token = this.getToken();
    return token ? `Bearer ${token}` : null;
  },
};

/**
 * Roles whose UI should be read-only (view without edit/action controls).
 * Reusable across MFEs to avoid repeating role checks.
 */
const READ_ONLY_ROLES = new Set(['WAITER']);

export function hasReadOnlyAccess(role?: string | null): boolean {
  return role !== undefined && role !== null && READ_ONLY_ROLES.has(role);
}

export function getIsReadOnly(): boolean {
  if (typeof window === 'undefined') return false;
  const role = AuthClient.getRole();
  return hasReadOnlyAccess(role);
}
