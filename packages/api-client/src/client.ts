import { ApiClientError } from './errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_BASE_URL: string = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:4000/api/v1';
const TOKEN_KEY = 'maison_access_token';

type RequestOptions = Omit<RequestInit, 'body'> & {
  params?: Record<string, string | number | boolean | undefined>;
};

function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  
  const headers: Record<string, string> = {};

  // 1. Token JWT (Autenticación)
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    
    // 2. Intentar sacar el slug del token si existe
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>;
      if (typeof payload.tenantSlug === 'string' && payload.tenantSlug) {
        headers['x-tenant-slug'] = payload.tenantSlug;
      }
    } catch { /* ignore */ }
  }

  // 3. PRIORIDAD: Si hay algo en localStorage, sobreescribe lo del token
  // Esto es útil si el usuario cambia de tenant o si el token no trae el slug
  const manualTenant = localStorage.getItem('currentTenantSlug');
  if (manualTenant) {
    headers['x-tenant-slug'] = manualTenant;
  }

  return headers;
}

async function request<T>(
  endpoint: string,
  options: RequestInit & { params?: Record<string, string | number | boolean | undefined> } = {},
): Promise<T> {
  const { params, ...fetchOptions } = options;
  const url = buildUrl(endpoint, params);

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Error de red' }));
    throw new ApiClientError(
      response.status,
      body.message ?? 'La solicitud falló',
      body.errors,
    );
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get<T>(endpoint: string, options?: RequestOptions) {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T>(endpoint: string, data: unknown, options?: RequestOptions) {
    return request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) });
  },

  put<T>(endpoint: string, data: unknown, options?: RequestOptions) {
    return request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data) });
  },

  patch<T>(endpoint: string, data: unknown, options?: RequestOptions) {
    return request<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(data) });
  },

  delete<T>(endpoint: string, options?: RequestOptions) {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};
