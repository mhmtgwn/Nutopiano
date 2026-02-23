/**
 * Frontend enums - mirrors backend enums for type-safe usage
 */

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SELLER = 'SELLER',
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
}

export enum OrderStatus {
  CREATED = 'CREATED',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
}

export enum SellerStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
  CLOSED = 'CLOSED',
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum ProductType {
  PHYSICAL = 'PHYSICAL',
  DIGITAL = 'DIGITAL',
  SERVICE = 'SERVICE',
}

/**
 * Enum helpers for display values and colors
 */

export const OrderStatusDisplay: Record<OrderStatus, string> = {
  [OrderStatus.CREATED]: 'Oluşturuldu',
  [OrderStatus.CONFIRMED]: 'Onaylandı',
  [OrderStatus.PROCESSING]: 'İşleniyor',
  [OrderStatus.SHIPPED]: 'Gönderildi',
  [OrderStatus.DELIVERED]: 'Teslim Edildi',
  [OrderStatus.COMPLETED]: 'Tamamlandı',
  [OrderStatus.CANCELLED]: 'İptal Edildi',
  [OrderStatus.REFUNDED]: 'Para İade Edildi',
  [OrderStatus.PENDING_PAYMENT]: 'Ödeme Bekleniyor',
  [OrderStatus.PAYMENT_FAILED]: 'Ödeme Başarısız',
};

export const OrderStatusColor: Record<OrderStatus, string> = {
  [OrderStatus.CREATED]: 'gray',
  [OrderStatus.CONFIRMED]: 'blue',
  [OrderStatus.PROCESSING]: 'yellow',
  [OrderStatus.SHIPPED]: 'purple',
  [OrderStatus.DELIVERED]: 'green',
  [OrderStatus.COMPLETED]: 'green',
  [OrderStatus.CANCELLED]: 'red',
  [OrderStatus.REFUNDED]: 'orange',
  [OrderStatus.PENDING_PAYMENT]: 'yellow',
  [OrderStatus.PAYMENT_FAILED]: 'red',
};

export const SellerStatusDisplay: Record<SellerStatus, string> = {
  [SellerStatus.PENDING_APPROVAL]: 'Onay Bekleniyor',
  [SellerStatus.APPROVED]: 'Onaylandı',
  [SellerStatus.ACTIVE]: 'Aktif',
  [SellerStatus.SUSPENDED]: 'Askıya Alındı',
  [SellerStatus.DEACTIVATED]: 'Deaktive Edildi',
  [SellerStatus.CLOSED]: 'Kapalı',
};

export const UserRoleDisplay: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Süper Admin',
  [UserRole.ADMIN]: 'Admin',
  [UserRole.SELLER]: 'Satıcı',
  [UserRole.CUSTOMER]: 'Müşteri',
  [UserRole.STAFF]: 'Personel',
};
