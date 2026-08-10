import { ApiResponse } from '@/types';

const BASE_URL = '/api';
const cache = new Map<string, { data: ApiResponse<unknown>; timestamp: number }>();
const CACHE_TTL = 30_000;

async function getToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('scos_token');
  } catch {
    return null;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const cacheKey = `${options.method || 'GET'}:${endpoint}:${JSON.stringify(options.body || '')}`;

  if (!options.method || options.method === 'GET') {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as ApiResponse<T>;
    }
  }

  try {
    const token = await getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      return { success: false, error: data.error || 'Request failed' };
    }

    const result = { success: true, data };

    if (!options.method || options.method === 'GET') {
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
    } else {
      clearApiCache();
    }

    return result;
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};

export function clearApiCache(pattern?: string) {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}
