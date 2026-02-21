/**
 * Application-wide constants
 */

export const APP_CONSTANTS = {
  // Pagination defaults
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Limits
  MAX_UPLOAD_SIZE_MB: 10,
  MAX_IMAGE_UPLOADS: 5,
  MAX_PRODUCT_NAME_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 5000,

  // Timeouts
  JWT_EXPIRATION_HOURS: 24,
  REFRESH_TOKEN_EXPIRATION_DAYS: 7,
  RESET_PASSWORD_TOKEN_EXPIRATION_MINUTES: 30,
  SESSION_TIMEOUT_MINUTES: 60,

  // API
  API_VERSION: 'v1',
  API_PREFIX: '/api',

  // Database
  DEFAULT_BUSINESS_NAME: 'Nutopiano',
  DEFAULT_CURRENCY: 'TRY',

  // Email
  EMAIL_FROM: 'no-reply@nutopiano.com',
  EMAIL_SUPPORT: 'support@nutopiano.com',

  // Features
  ENABLE_SELLER_PORTAL: true,
  ENABLE_APPOINTMENTS: true,
  ENABLE_PRODUCTS: true,
  ENABLE_PAYMENTS: true,

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,

  // Cache
  CACHE_TTL_SECONDS: 300, // 5 minutes
  CACHE_ENABLED: false,
} as const;
