/**
 * Turkish messages for the application
 */

export const APP_MESSAGES = {
  // Success messages
  SUCCESS: 'İşlem başarılı',
  CREATED_SUCCESS: '{{entity}} başarıyla oluşturuldu',
  UPDATED_SUCCESS: '{{entity}} başarıyla güncellendi',
  DELETED_SUCCESS: '{{entity}} başarıyla silindi',
  LOADED_SUCCESS: '{{entity}} başarıyla yüklendi',

  // Auth messages
  LOGIN_SUCCESS: 'Giriş başarılı',
  LOGOUT_SUCCESS: 'Çıkış başarılı',
  REGISTER_SUCCESS: 'Kayıt başarılı. Lütfen e-posta adresinizi doğrulayınız',
  PASSWORD_RESET_SUCCESS: 'Parola başarıyla sıfırlandı',
  PASSWORD_CHANGED_SUCCESS: 'Parola başarıyla değiştirildi',
  EMAIL_VERIFIED: 'E-posta adresi doğrulandı',

  // Error messages
  ERROR: 'Bir hata oluştu',
  TRY_AGAIN: 'Lütfen tekrar deneyiniz',
  SERVER_ERROR: 'Sunucu hatası oluştu. Lütfen tekrar deneyiniz',
  NETWORK_ERROR: 'Ağ hatası oluştu. İnternet bağlantınızı kontrol ediniz',
  TIMEOUT_ERROR: 'İstek zaman aşımına uğradı. Lütfen tekrar deneyiniz',

  // Auth errors
  INVALID_EMAIL: 'Geçersiz e-posta adresi',
  INVALID_PASSWORD: 'Geçersiz parola',
  EMAIL_ALREADY_EXISTS: 'Bu e-posta adresi zaten kayıtlı',
  USER_NOT_FOUND: 'Kullanıcı bulunamadı',
  INVALID_CREDENTIALS: 'E-posta veya parola hatalı',
  UNAUTHORIZED: 'Yetkiniz yok',
  EXPIRED_TOKEN: 'Oturunuzun süresi doldu. Lütfen tekrar giriş yapınız',
  INVALID_TOKEN: 'Geçersiz token',

  // Search and filter
  NO_RESULTS: 'Sonuç bulunamadı',
  SEARCH_PLACEHOLDER: 'Ara...',
  FILTER_PLACEHOLDER: 'Filtrele...',
  LOADING: 'Yükleniyor...',
  LOADING_MORE: 'Daha fazla yükleniyor...',

  // Confirmations
  CONFIRM_DELETE: '{{entity}} silmek istediğinizden emin misiniz?',
  CONFIRM_ACTION: 'Bu işlemi yapmak istediğinizden emin misiniz?',
  UNSAVED_CHANGES: 'Kaydedilmemiş değişiklikler var. Çıkmak istediğinizden emin misiniz?',

  // Validation
  REQUIRED_FIELD: 'Bu alan gereklidir',
  INVALID_FORMAT: 'Geçersiz biçim',
  MUST_BE_POSITIVE: 'Değer pozitif olmalıdır',
  MUST_BE_UNIQUE: 'Bu değer zaten kullanılıyor',

  // Empty states
  EMPTY_CUSTOMERS: 'Müşteri bulunamadı',
  EMPTY_PRODUCTS: 'Ürün bulunamadı',
  EMPTY_ORDERS: 'Sipariş bulunamadı',
  EMPTY_APPOINTMENTS: 'Randevu bulunamadı',

  // Pagination
  SHOWING: '{{from}}-{{to}} / {{total}} gösteriliyor',
  NO_MORE_ITEMS: 'Daha fazla içerik yok',
  PAGE: 'Sayfa {{page}} / {{total}}',

  // File operations
  FILE_UPLOADED: 'Dosya başarıyla yüklendi',
  FILE_UPLOAD_ERROR: 'Dosya yüklenirken hata oluştu',
  FILE_TOO_LARGE: 'Dosya çok büyük',
  INVALID_FILE_TYPE: 'Geçersiz dosya türü',

  // Payment
  PAYMENT_SUCCESS: 'Ödeme başarılı',
  PAYMENT_FAILED: 'Ödeme başarısız',
  PAYMENT_PENDING: 'Ödeme bekleniyor',

  // Order related
  ORDER_CREATED: 'Sipariş oluşturuldu',
  ORDER_CONFIRMED: 'Sipariş onaylandı',
  ORDER_PROCESSING: 'Sipariş işleniyor',
  ORDER_SHIPPED: 'Sipariş gönderildi',
  ORDER_DELIVERED: 'Sipariş teslim edildi',
  ORDER_CANCELLED: 'Sipariş iptal edildi',

  // Product related
  PRODUCT_OUT_OF_STOCK: 'Ürün stokta yok',
  PRODUCT_IN_CART: 'Ürün sepete eklendi',
  PRODUCT_REMOVED_FROM_CART: 'Ürün sepetten çıkarıldı',

  // Welcome messages
  WELCOME: 'Hoş geldiniz, {{name}}',
  WELCOME_BACK: 'Tekrar hoş geldiniz',
  GOODBYE: 'Güle güle',
};

export const VALIDATION_MESSAGES_DISPLAY = {
  // General
  REQUIRED: 'Bu alan gereklidir',
  INVALID: 'Geçersiz bilgi',

  // Email
  EMAIL_REQUIRED: 'E-posta adresi gereklidir',
  EMAIL_INVALID: 'Geçerli bir e-posta adresi giriniz',

  // Password
  PASSWORD_REQUIRED: 'Parola gereklidir',
  PASSWORD_TOO_SHORT: 'Parola en az 8 karakter olmalıdır',
  PASSWORD_WEAK: 'Parola çok zayıf',

  // Phone
  PHONE_REQUIRED: 'Telefon numarası gereklidir',
  PHONE_INVALID: 'Geçerli bir telefon numarası giriniz',

  // Name
  NAME_REQUIRED: 'Ad gereklidir',
  NAME_TOO_SHORT: 'Ad en az 2 karakter olmalıdır',
};
