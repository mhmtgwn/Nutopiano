import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.API_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://api.nutopiano.com/api/v1'
    : 'http://localhost:3001/api/v1');

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const getCookieValue = (name: string) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

api.interceptors.request.use(
  (config) => {
    const method = (config.method ?? 'get').toLowerCase();
    const isUnsafe = ['post', 'put', 'patch', 'delete'].includes(method);
    if (isUnsafe) {
      const csrfToken = getCookieValue('__csrf');
      if (csrfToken) {
        if (config.headers && typeof (config.headers as any).set === 'function') {
          (config.headers as any).set('X-CSRF-Token', csrfToken);
        } else {
          config.headers = {
            ...(config.headers ?? {}),
            'X-CSRF-Token': csrfToken,
          } as any;
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => {
    const data: unknown = response.data;

    const isWrappedSuccess = (
      value: unknown,
    ): value is { success: boolean; data: unknown; message?: unknown } => {
      if (!value || typeof value !== 'object') return false;
      return 'success' in value && 'data' in value;
    };

    if (
      isWrappedSuccess(data) &&
      typeof data.success === 'boolean' &&
      data.success
    ) {
      // Backend wraps all successful responses as { success, data, message }.
      // Unwrap so callers can keep using response.data as the inner payload.
      return { ...response, data: data.data };
    }

    return response;
  },
  async (error) => {
    const originalRequest = error?.config as RetriableRequestConfig | undefined;
    const statusCode = error?.response?.status as number | undefined;
    const requestUrl = originalRequest?.url ?? '';
    const isRefreshRequest = requestUrl.includes('/auth/refresh');

    if (
      statusCode !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isRefreshRequest
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await api.post('/auth/refresh');
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);

export default api;
