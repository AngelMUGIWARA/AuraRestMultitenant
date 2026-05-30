import { ApiClientError } from './errors';

const API_BASE_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  'http://localhost:4000/api/v1';

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
