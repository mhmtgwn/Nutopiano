/**
 * Data fetching hook with loading and error states
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { ApiResponse } from '@/types';

export interface UseFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  headers?: Record<string, string>;
  body?: any;
  skip?: boolean;
  dependencies?: any[];
}

export interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  statusCode?: number;
}

export function useFetch<T = any>(
  url: string,
  options: UseFetchOptions = {},
): UseFetchState<T> & { refetch: () => Promise<void> } {
  const { method = 'GET', headers = {}, body, skip = false, dependencies = [url] } = options;

  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (skip) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const json: ApiResponse<T> = await response.json();

      setState({
        data: json.data || null,
        loading: false,
        error: null,
        statusCode: response.status,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, don't update state
        return;
      }

      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
    }
  }, [url, method, headers, body, skip]);

  useEffect(() => {
    fetchData();

    return () => {
      // Cancel request on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, dependencies);

  return {
    ...state,
    refetch: fetchData,
  };
}
