/**
 * Validation patterns, rules and constraints
 */

export const VALIDATION_PATTERNS = {
  // Email pattern - RFC 5322 simplified
  EMAIL:
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // Password - min 8 chars, at least one uppercase, one lowercase, one number, one special char
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,

  // Phone - Turkish phone number format
  PHONE: /^(\+90)?5\d{9}$/,

  // URL
  URL: /^https?:\/\/.+/,

  // Slug
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,

  // UUID
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,

  // Only numbers
  NUMERIC: /^\d+$/,

  // Only letters
  ALPHABETIC: /^[a-zA-Z\s]+$/,

  // Turkish ID number (11 digits)
  TURKISH_ID: /^\d{11}$/,

  // Turkish tax number (10 digits)
  TURKISH_TAX_NUMBER: /^\d{10}$/,
};

export const VALIDATION_RULES = {
  // Name
  NAME: {
    minLength: 2,
    maxLength: 100,
    pattern: VALIDATION_PATTERNS.ALPHABETIC,
  },

  // Email
  EMAIL: {
    minLength: 5,
    maxLength: 255,
    pattern: VALIDATION_PATTERNS.EMAIL,
  },

  // Password
  PASSWORD: {
    minLength: 8,
    maxLength: 128,
    pattern: VALIDATION_PATTERNS.PASSWORD,
  },

  // Phone
  PHONE: {
    minLength: 10,
    maxLength: 13,
    pattern: VALIDATION_PATTERNS.PHONE,
  },

  // Product name
  PRODUCT_NAME: {
    minLength: 2,
    maxLength: 255,
  },

  // Product description
  PRODUCT_DESCRIPTION: {
    minLength: 0,
    maxLength: 2000,
  },

  // Category name
  CATEGORY_NAME: {
    minLength: 2,
    maxLength: 100,
  },

  // City/Address
  CITY: {
    minLength: 2,
    maxLength: 100,
  },

  ADDRESS: {
    minLength: 5,
    maxLength: 500,
  },

  // Notes/Comments
  NOTES: {
    minLength: 0,
    maxLength: 5000,
  },

  // Price (in cents)
  PRICE: {
    min: 0,
    max: 999999999, // 9,999,999.99
  },

  // Quantity
  QUANTITY: {
    min: 1,
    max: 999999,
  },

  // Percentage
  PERCENTAGE: {
    min: 0,
    max: 100,
  },
};

// Custom validation messages
export const VALIDATION_MESSAGES = {
  // Required fields
  REQUIRED: 'Bu alan gereklidir',
  REQUIRED_PLURAL: 'Lütfen seçim yapınız',

  // Email
  INVALID_EMAIL: 'Geçerli bir e-posta adresi giriniz',
  EMAIL_ALREADY_EXISTS: 'Bu e-posta adresi zaten kayıtlı',

  // Password
  INVALID_PASSWORD: 'Parola en az 8 karakter ve özel karakter içermeli',
  PASSWORD_TOO_SHORT: 'Parola en az {{min}} karakter olmalıdır',
  PASSWORD_NO_MATCH: 'Parolalar eşleşmiyor',
  WEAK_PASSWORD: 'Parola çok zayıf',

  // Phone
  INVALID_PHONE: 'Geçerli bir telefon numarası giriniz',

  // Name
  NAME_TOO_SHORT: 'Ad en az {{min}} karakter olmalıdır',
  NAME_TOO_LONG: 'Ad maksimum {{max}} karakter olabilir',

  // Text length
  TOO_SHORT: '{{field}} en az {{min}} karakter olmalıdır',
  TOO_LONG: '{{field}} maksimum {{max}} karakter olabilir',

  // Numbers
  INVALID_NUMBER: 'Geçerli bir sayı giriniz',
  NUMBER_TOO_SMALL: 'Sayı en az {{min}} olmalıdır',
  NUMBER_TOO_LARGE: 'Sayı maksimum {{max}} olabilir',

  // URL
  INVALID_URL: 'Geçerli bir URL giriniz',

  // File
  FILE_TOO_LARGE: 'Dosya {{max}}MB\'den büyük olamaz',
  INVALID_FILE_TYPE: 'Geçerli olmayan dosya türü',

  // Price/Currency
  INVALID_PRICE: 'Geçerli bir fiyat giriniz',

  // Date
  INVALID_DATE: 'Geçerli bir tarih giriniz',
  DATE_IN_PAST: 'Tarih geçmişte olamaz',
  DATE_IN_FUTURE: 'Tarih geleceğe olamaz',

  // Pattern
  INVALID_PATTERN: '{{field}} geçersiz biçimdedir',

  // Unique
  NOT_UNIQUE: 'Bu değer zaten kullanılıyor',

  // Custom
  CUSTOM_ERROR: '{{message}}',
};
