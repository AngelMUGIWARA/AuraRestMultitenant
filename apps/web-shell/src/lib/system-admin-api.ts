import { API_BASE_URL } from '@/lib/constants';
import { SystemAdminSession } from '@/lib/system-admin-session';

// Cliente HTTP mínimo y separado de @maison/api-client: ese cliente adjunta
// el JWT/x-tenant-slug de un tenant y reintenta contra /auth/refresh (rutas
// de tenant) — reusarlo aquí mezclaría por accidente la sesión de tenant con
// la de Super Admin. Este cliente solo habla con /system-admin/*.

const NO_REFRESH_RETRY = ['/system-admin/auth/login', '/system-admin/auth/refresh'];

let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = SystemAdminSession.getRefreshToken();
      if (!refreshToken) return false;

      const res = await fetch(`${API_BASE_URL}/system-admin/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        SystemAdminSession.clear();
        return false;
      }

      const data = await res.json();
      SystemAdminSession.setAccessToken(data.accessToken);
      SystemAdminSession.setRefreshToken(data.refreshToken);
      return true;
    } catch {
      SystemAdminSession.clear();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const authHeader = SystemAdminSession.getAuthHeader();

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401 && !NO_REFRESH_RETRY.includes(endpoint)) {
      const refreshed = await attemptRefresh();
      if (refreshed) return request<T>(endpoint, options);
    }
    const body = await res.json().catch(() => ({ message: 'Error de red' }));
    throw new Error(body.message ?? `Error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const systemAdminApi = {
  get<T>(endpoint: string) {
    return request<T>(endpoint, { method: 'GET' });
  },
  post<T>(endpoint: string, data: unknown) {
    return request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) });
  },
  patch<T>(endpoint: string, data: unknown) {
    return request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) });
  },
  put<T>(endpoint: string, data: unknown) {
    return request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) });
  },
};
