/**
 * Pagination state management hook
 */

import { useState, useCallback } from 'react';
import { APP_CONSTANTS } from '@/constants';
import type { Pagination } from '@/types';

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  maxPageSize?: number;
}

export interface UsePaginationState extends Pagination {
  page: number;
  pageSize: number;
}

export function usePagination(options: UsePaginationOptions = {}) {
  const {
    initialPage = APP_CONSTANTS.DEFAULT_PAGE,
    initialPageSize = APP_CONSTANTS.DEFAULT_PAGE_SIZE,
    maxPageSize = APP_CONSTANTS.MAX_PAGE_SIZE,
  } = options;

  const [pagination, setPagination] = useState<Partial<UsePaginationState>>({
    page: initialPage,
    pageSize: initialPageSize,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({
      ...prev,
      page: Math.max(1, page),
    }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    const normalizedSize = Math.min(pageSize, maxPageSize);
    setPagination((prev) => ({
      ...prev,
      pageSize: normalizedSize,
      page: 1, // Reset to first page when changing page size
    }));
  }, [maxPageSize]);

  const goToNextPage = useCallback(() => {
    setPagination((prev) => {
      const nextPage = (prev.page || 1) + 1;
      if (prev.hasNextPage) {
        return { ...prev, page: nextPage };
      }
      return prev;
    });
  }, []);

  const goToPreviousPage = useCallback(() => {
    setPagination((prev) => {
      const prevPage = Math.max(1, (prev.page || 1) - 1);
      return { ...prev, page: prevPage };
    });
  }, []);

  const resetPagination = useCallback(() => {
    setPagination({
      page: initialPage,
      pageSize: initialPageSize,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  }, [initialPage, initialPageSize]);

  const updatePagination = useCallback((newPagination: Partial<Pagination>) => {
    setPagination((prev) => ({
      ...prev,
      ...newPagination,
    }));
  }, []);

  const isFirstPage = (pagination.page || 1) === 1;
  const isLastPage = !pagination.hasNextPage;

  return {
    ...pagination,
    page: pagination.page || initialPage,
    pageSize: pagination.pageSize || initialPageSize,
    total: pagination.total || 0,
    totalPages: pagination.totalPages || 0,
    hasNextPage: pagination.hasNextPage || false,
    hasPreviousPage: pagination.hasPreviousPage || false,
    isFirstPage,
    isLastPage,
    setPage,
    setPageSize,
    goToNextPage,
    goToPreviousPage,
    resetPagination,
    updatePagination,
  };
}
