// Sesión del Super Admin — deliberadamente separada de @maison/auth-client.
// El Super Admin no es un usuario de tenant (no tiene tenantSlug/branchId,
// su JWT viene de /system-admin/auth/*, firmado con un secreto distinto), así
// que usa su propia clave de localStorage para poder coexistir en el mismo
// navegador con una sesión de tenant sin pisarse.

const ACCESS_KEY = 'maison_sa_access_token';
const REFRESH_KEY = 'maison_sa_refresh_token';

interface SystemAdminJwtPayload {
  sub: string;
  email: string;
  role: 'SUPER_ADMIN';
  exp: number;
  iat: number;
}

function parseJwt(token: string): SystemAdminJwtPayload | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload)) as SystemAdminJwtPayload;
  } catch {
    return null;
  }
}

export const SystemAdminSession = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_KEY);
  },

  setAccessToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_KEY, token);
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_KEY);
  },

  setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(REFRESH_KEY, token);
  },

  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;
    const payload = parseJwt(token);
    if (!payload) return false;
    return payload.exp * 1000 > Date.now() + 30_000;
  },

  getEmail(): string | null {
    const token = this.getAccessToken();
    if (!token) return null;
    return parseJwt(token)?.email ?? null;
  },

  getAuthHeader(): string | null {
    const token = this.getAccessToken();
    return token ? `Bearer ${token}` : null;
  },
};
