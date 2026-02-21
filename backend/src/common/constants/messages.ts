/**
 * Application messages in Turkish
 */

export const APP_MESSAGES = {
  // Success messages
  SUCCESS: 'İşlem başarılı',
  CREATED: 'Başarıyla oluşturuldu',
  UPDATED: 'Başarıyla güncellendi',
  DELETED: 'Başarıyla silindi',
  LOGIN_SUCCESS: 'Başarıyla giriş yapıldı',
  LOGOUT_SUCCESS: 'Başarıyla çıkış yapıldı',
  PASSWORD_CHANGED: 'Şifre başarıyla değiştirildi',
  PASSWORD_RESET_EMAIL_SENT:
    'Şifre sıfırlama bağlantısı e-postanıza gönderildi',

  // Error messages - Auth
  INVALID_CREDENTIALS: 'E-posta/Telefon veya şifre hatalı',
  TOKEN_EXPIRED: 'Oturum süresi doldu. Lütfen tekrar giriş yapınız',
  TOKEN_INVALID: 'Geçersiz token',
  UNAUTHORIZED: 'Bu işlem için yetkiniz yok',
  FORBIDDEN: 'Bu kaynağa erişim izni yok',
  USER_NOT_FOUND: 'Kullanıcı bulunamadı',
  EMAIL_ALREADY_EXISTS: 'Bu e-posta adresi zaten kayıtlı',
  PHONE_ALREADY_EXISTS: 'Bu telefon numarası zaten kayıtlı',
  WEAK_PASSWORD:
    'Şifre çok zayıf. En az 12 karakter, büyük harf, küçük harf, rakam ve özel karakter gerekli',
  INVALID_EMAIL_FORMAT: 'Geçersiz e-posta formatı',
  INVALID_PHONE_FORMAT:
    'Geçersiz telefon formatı. +905XXXXXXXXX formatında girin',

  // Error messages - Validation
  VALIDATION_FAILED: 'Doğrulama başarısız',
  INVALID_INPUT: 'Geçersiz giriş',
  MISSING_REQUIRED_FIELD: 'Zorunlu alanları doldurunuz',
  INVALID_ENUM_VALUE: 'Geçersiz seçim',

  // Error messages - Resources
  NOT_FOUND: 'Kaynak bulunamadı',
  ALREADY_EXISTS: 'Kaynak zaten var',
  CONFLICT: 'Çakışma oluştu',

  // Error messages - Business Logic
  INSUFFICIENT_STOCK: 'Stok yetersiz',
  INVALID_ORDER_STATUS: 'Geçersiz sipariş durumu',
  INVALID_PAYMENT: 'Geçersiz ödeme',
  COMMISSION_CALCULATION_FAILED: 'Komisyon hesaplaması başarısız oldu',
  SELLER_NOT_APPROVED: 'Satıcı hesabı henüz onaylanmamış',
  APPOINTMENT_CONFLICT: 'Bu saatte başka bir randevu var',
  CUSTOMER_NOT_FOUND: 'Müşteri bulunamadı',
  PRODUCT_NOT_FOUND: 'Ürün bulunamadı',
  ORDER_NOT_FOUND: 'Sipariş bulunamadı',
  APPOINTMENT_NOT_FOUND: 'Randevu bulunamadı',

  // Error messages - System
  INTERNAL_SERVER_ERROR: 'Sunucu hatası oluştu',
  SERVICE_UNAVAILABLE: 'Servis şu anda kullanılamıyor',
  RATE_LIMIT_EXCEEDED: 'Çok fazla istek. Lütfen biraz beklemeyi deneyin',
  REQUEST_TIMEOUT: 'İstek zaman aşımına uğradı',

  // Business-specific messages
  SELLER_REGISTRATION_SUCCESS:
    'Satıcı kaydınız başarıyla alındı. Size yakında onay e-postası göndereceğiz',
  CUSTOMER_REGISTRATION_SUCCESS:
    'Hesabınız başarıyla oluşturuldu. Hoş geldiniz!',
  ORDER_CREATED: 'Siparişiniz başarıyla oluşturuldu',
  ORDER_CANCELLED: 'Siparişiniz iptal edildi',
  APPOINTMENT_SCHEDULED: 'Randevunuz başarıyla kayıt edildi',
  APPOINTMENT_CANCELLED: 'Randevunuz iptal edildi',
  PAYMENT_SUCCESSFUL: 'Ödemeniz başarıyla alındı',
  PAYMENT_FAILED: 'Ödeme işlemi başarısız. Lütfen tekrar deneyiniz',
} as const;

export const VALIDATION_MESSAGES = {
  REQUIRED: 'Bu alan zorunludur',
  MIN_LENGTH: 'En az {min} karakter gerekli',
  MAX_LENGTH: 'En fazla {max} karakter olabilir',
  EMAIL: 'Geçerli bir e-posta adresi girin',
  PHONE: 'Geçerli bir telefon numarası girin (+905XXXXXXXXX)',
  MIN_VALUE: 'En küçük değer {min}',
  MAX_VALUE: 'En büyük değer {max}',
  PATTERN: 'Geçersiz format',
  ENUM: 'Geçersiz seçim',
} as const;
