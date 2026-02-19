/**
 * API endpoints and routes constants
 */

// Base API configuration
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://api.nutopiano.com/api'
    : 'http://localhost:3001/api');

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    VERIFY: '/auth/verify',
    REFRESH: '/auth/refresh',
    RESET_PASSWORD: '/auth/reset-password',
    FORGOT_PASSWORD: '/auth/forgot-password',
  },

  // Users
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    CHANGE_PASSWORD: '/users/change-password',
  },

  // Customers
  CUSTOMERS: {
    BASE: '/customers',
    LIST: '/customers',
    CREATE: '/customers',
    GET: (id: number) => `/customers/${id}`,
    UPDATE: (id: number) => `/customers/${id}`,
    DELETE: (id: number) => `/customers/${id}`,
  },

  // Products
  PRODUCTS: {
    BASE: '/products',
    LIST: '/products',
    CREATE: '/products',
    GET: (id: number) => `/products/${id}`,
    UPDATE: (id: number) => `/products/${id}`,
    DELETE: (id: number) => `/products/${id}`,
    SEARCH: '/products/search',
  },

  // Orders
  ORDERS: {
    BASE: '/orders',
    LIST: '/orders',
    CREATE: '/orders',
    GET: (id: number) => `/orders/${id}`,
    UPDATE: (id: number) => `/orders/${id}`,
    UPDATE_STATUS: (id: number) => `/orders/${id}/status`,
    CANCEL: (id: number) => `/orders/${id}/cancel`,
    DELETE: (id: number) => `/orders/${id}`,
  },

  // Appointments
  APPOINTMENTS: {
    BASE: '/appointments',
    LIST: '/appointments',
    CREATE: '/appointments',
    GET: (id: number) => `/appointments/${id}`,
    UPDATE: (id: number) => `/appointments/${id}`,
    CANCEL: (id: number) => `/appointments/${id}/cancel`,
    DELETE: (id: number) => `/appointments/${id}`,
  },

  // Categories
  CATEGORIES: {
    BASE: '/categories',
    LIST: '/categories',
    CREATE: '/categories',
    GET: (id: number) => `/categories/${id}`,
    UPDATE: (id: number) => `/categories/${id}`,
    DELETE: (id: number) => `/categories/${id}`,
  },

  // Settings
  SETTINGS: {
    BASE: '/settings',
    GET_BY_KEY: (key: string) => `/settings/${key}`,
    UPDATE: (key: string) => `/settings/${key}`,
  },

  // Uploads
  UPLOADS: {
    IMAGE: '/uploads/image',
    FILE: '/uploads/file',
  },
};

// Request headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Response codes
export const RESPONSE_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Error codes
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UNAUTHORIZED_ERROR: 'UNAUTHORIZED_ERROR',
  FORBIDDEN_ERROR: 'FORBIDDEN_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};
