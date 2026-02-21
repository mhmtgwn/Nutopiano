/**
 * Application constants
 */

export const APP_CONSTANTS = {
  // Pagination
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Limits
  MAX_FILE_SIZE_MB: 10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  MAX_IMAGE_SIZE_MB: 5,
  MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024,

  // Timeouts
  API_TIMEOUT_MS: 30000,
  DEBOUNCE_DELAY_MS: 300,
  TOAST_DURATION_MS: 5000,

  // Cache
  CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes
  CACHE_KEY_PREFIX: 'nutopiano_',

  // UI
  ANIMATION_DURATION_MS: 300,
  MODAL_Z_INDEX: 1000,
  DROPDOWN_Z_INDEX: 999,

  // Date formats
  DATE_FORMAT: 'dd.MM.yyyy',
  TIME_FORMAT: 'HH:mm',
  DATETIME_FORMAT: 'dd.MM.yyyy HH:mm',

  // App info
  APP_NAME: 'Nutopiano',
  APP_VERSION: '1.0.0',
};

// Supported file types
export const SUPPORTED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  documents: ['application/pdf', 'application/msword'],
  files: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
    'application/pdf',
    'application/msword',
  ],
};

// File extension mappings
export const FILE_EXTENSIONS = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// Route paths
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  DASHBOARD: '/dashboard',
  PRODUCTS: '/dashboard/products',
  PRODUCTS_NEW: '/dashboard/products/new',
  PRODUCTS_EDIT: (id: number) => `/dashboard/products/${id}/edit`,
  ORDERS: '/dashboard/orders',
  ORDERS_DETAIL: (id: number) => `/dashboard/orders/${id}`,
  CUSTOMERS: '/dashboard/customers',
  CUSTOMERS_DETAIL: (id: number) => `/dashboard/customers/${id}`,
  APPOINTMENTS: '/dashboard/appointments',
  SETTINGS: '/dashboard/settings',
  PROFILE: '/dashboard/profile',
  UNAUTHORIZED: '/unauthorized',
  NOT_FOUND: '/404',
};

// Theme colors
export const THEME_COLORS = {
  primary: '#000000',
  secondary: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  gray: '#F3F4F6',
  darkGray: '#1F2937',
};
