/**
 * API client wrapper for making HTTP requests
 */

import { API_BASE_URL, API_ENDPOINTS, RESPONSE_CODES } from '@/constants';
import type { ApiResponse, ApiError } from '@/types';

export interface RequestConfig {
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(baseUrl: string = API_BASE_URL, timeout: number = 30000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(endpoint, this.baseUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  private async request<T = any>(
    method: string,
    endpoint: string,
    config: RequestConfig = {},
  ): Promise<ApiResponse<T>> {
    const { headers = {}, body, params, timeout = this.timeout } = config;

    const url = this.buildUrl(endpoint, params);

    const requestHeaders: Record<string, string> = {
      ...this.defaultHeaders,
      ...headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
        signal: controller.signal,
      });

      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        console.error(`API Error [${response.status}]:`, data);
      }

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          statusCode: RESPONSE_CODES.INTERNAL_SERVER_ERROR,
          error: 'Request timeout',
        };
      }

      console.error('API Request Error:', error);

      return {
        success: false,
        statusCode: RESPONSE_CODES.INTERNAL_SERVER_ERROR,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async get<T = any>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, config);
  }

  async post<T = any>(
    endpoint: string,
    body?: any,
    config: RequestConfig = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, { ...config, body });
  }

  async patch<T = any>(
    endpoint: string,
    body?: any,
    config: RequestConfig = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, { ...config, body });
  }

  async put<T = any>(
    endpoint: string,
    body?: any,
    config: RequestConfig = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, { ...config, body });
  }

  async delete<T = any>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, config);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
