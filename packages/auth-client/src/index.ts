import type { AuthUser, AuthTokenPayload } from '@maison/types';

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

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
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

  /** Returns Authorization header value or null if not authenticated. */
  getAuthHeader(): string | null {
    const token = this.getToken();
    return token ? `Bearer ${token}` : null;
  },
};
