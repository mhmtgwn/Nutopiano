/**
 * Order status enumeration
 * Defines the lifecycle states of an order
 */

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

export const ORDER_STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  [OrderStatus.CREATED]: 'Oluşturuldu',
  [OrderStatus.CONFIRMED]: 'Onaylandı',
  [OrderStatus.PROCESSING]: 'İşleniyor',
  [OrderStatus.SHIPPED]: 'Gönderildi',
  [OrderStatus.DELIVERED]: 'Teslim edildi',
  [OrderStatus.COMPLETED]: 'Tamamlandı',
  [OrderStatus.CANCELLED]: 'İptal edildi',
  [OrderStatus.REFUNDED]: 'İade edildi',
  [OrderStatus.PENDING_PAYMENT]: 'Ödeme bekliyor',
  [OrderStatus.PAYMENT_FAILED]: 'Ödeme başarısız',
};

export const FINAL_ORDER_STATUSES = [
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
] as const;

export const SHIPMENT_STATUSES = [
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
] as const;
