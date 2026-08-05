import { AuthClient } from '@maison/auth-client';
import { emit } from '@maison/event-bus';
import { ApiClientError } from './errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_URL ??
  'http://localhost:4000/api/v1';

// ✅ OPTIMIZACIÓN: Timeout global para requests (15 segundos)
const REQUEST_TIMEOUT = 15000;

const REFRESH_EXCLUDED = [
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
];

type RequestOptions = Omit<RequestInit, 'body'> & {
  params?: Record<
    string,
    string | number | boolean | undefined
  >;
};

let refreshPromise: Promise<boolean> | null = null;

function buildUrl(
  endpoint: string,
  params?: Record<
    string,
    string | number | boolean | undefined
  >,
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
  if (typeof window === 'undefined') {
    return {};
  }

  const headers: Record<string, string> = {};

  const authHeader = AuthClient.getAuthHeader();

  if (authHeader) {
    headers.Authorization = authHeader;

    const slug = AuthClient.getTenantSlug();

    if (slug) {
      headers['x-tenant-slug'] = slug;
    }
  }

  const manualTenant = localStorage.getItem(
    'currentTenantSlug',
  );

  if (manualTenant) {
    headers['x-tenant-slug'] = manualTenant;
  }

  return headers;
}

function shouldAttemptRefresh(
  endpoint: string,
): boolean {
  return !REFRESH_EXCLUDED.some((p) =>
    endpoint.startsWith(p),
  );
}

async function attemptRefresh(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken =
        AuthClient.getRefreshToken();

      if (!refreshToken) {
        return false;
      }

      const res = await fetch(
        `${API_BASE_URL}/auth/refresh`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refreshToken,
          }),
        },
      );

      if (!res.ok) {
        AuthClient.clearTokens();
        emit('auth:session-expired', undefined);
        return false;
      }

      const data = await res.json();

      AuthClient.setAccessToken(
        data.accessToken,
      );

      if (data.refreshToken) {
        AuthClient.setRefreshToken(
          data.refreshToken,
        );
      }

      return true;
    } catch {
      AuthClient.clearTokens();
      emit('auth:session-expired', undefined);
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(
  endpoint: string,
  options: RequestInit & {
    params?: Record<
      string,
      string | number | boolean | undefined
    >;
  } = {},
): Promise<T> {
  const { params, ...fetchOptions } = options;

  const url = buildUrl(endpoint, params);

  const isFormData =
    fetchOptions.body instanceof FormData;

  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  if (!isFormData) {
    headers['Content-Type'] =
      'application/json';
  }

  // ✅ OPTIMIZACIÓN: Agregar timeout global
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response
        .json()
        .catch(() => ({
          message: 'Error de red',
        }));

      const error = new ApiClientError(
        response.status,
        body.message ?? 'La solicitud falló',
        body.errors,
      );

      if (
        response.status === 401 &&
        shouldAttemptRefresh(endpoint)
      ) {
        const refreshed =
          await attemptRefresh();

        if (refreshed) {
          return request<T>(endpoint, options);
        }
      }

      throw error;
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const apiClient = {
  get<T>(
    endpoint: string,
    options?: RequestOptions,
  ) {
    return request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  },

  post<T>(
    endpoint: string,
    data: unknown,
    options?: RequestOptions,
  ) {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body:
        data instanceof FormData
          ? data
          : JSON.stringify(data),
    });
  },

  put<T>(
    endpoint: string,
    data: unknown,
    options?: RequestOptions,
  ) {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body:
        data instanceof FormData
          ? data
          : JSON.stringify(data),
    });
  },

  patch<T>(
    endpoint: string,
    data: unknown,
    options?: RequestOptions,
  ) {
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body:
        data instanceof FormData
          ? data
          : JSON.stringify(data),
    });
  },

  delete<T>(
    endpoint: string,
    options?: RequestOptions,
  ) {
    return request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  },
};