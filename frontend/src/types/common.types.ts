/**
 * Common/shared types across the application
 */

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedList<T> {
  items: T[];
  pagination: Pagination;
}

export interface Filter {
  [key: string]: string | number | boolean | undefined;
}

export interface Sort {
  field: string;
  order: 'asc' | 'desc';
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  filter?: Filter;
  sort?: Sort;
}

export interface ServerResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  statusCode: number;
}

export interface ErrorDetails {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

export interface FormOptions {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TimeRange {
  start: string; // HH:mm format
  end: string; // HH:mm format
}

export interface Location {
  city: string;
  address: string;
}
