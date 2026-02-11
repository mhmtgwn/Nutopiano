import axios from 'axios';
import { getAuthToken } from '@/utils/helpers';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://api.nutopiano.com/api'
    : 'http://localhost:3000/api');

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = getAuthToken();

      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
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
  (error) => Promise.reject(error),
);

export default api;
