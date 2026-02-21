/**
 * Pagination utilities
 */

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Calculate skip variable for Prisma
 */
export function calculateSkip(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / pageSize);
  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Normalize pagination params
 */
export function normalizePaginationParams(
  page?: number | string,
  pageSize?: number | string,
  maxPageSize: number = 100,
): PaginationParams {
  let normalizedPage = 1;
  let normalizedPageSize = 20;

  if (page) {
    const parsedPage = typeof page === 'string' ? parseInt(page, 10) : page;
    normalizedPage = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage);
  }

  if (pageSize) {
    const parsedPageSize =
      typeof pageSize === 'string' ? parseInt(pageSize, 10) : pageSize;
    normalizedPageSize = Math.min(
      maxPageSize,
      Math.max(1, isNaN(parsedPageSize) ? 20 : parsedPageSize),
    );
  }

  return { page: normalizedPage, pageSize: normalizedPageSize };
}
