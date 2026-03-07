export const OUTBOX_EVENT_TYPES = {
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_CHANGED: 'order.status.changed',
  ORDER_CANCELLED: 'order.cancelled',
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_SESSION_CREATED: 'payment.session.created',
  PAYMENT_CAPTURED: 'payment.captured',
  PAYMENT_FAILED: 'payment.failed',
  PRODUCT_PUBLISH_CHANGED: 'product.publish.changed',
  CATALOG_PRODUCT_UPDATED: 'catalog.product.updated',
  INVENTORY_STOCK_ADJUSTED: 'inventory.stock.adjusted',
  INVENTORY_RESERVATION_CREATED: 'inventory.reservation.created',
  INVENTORY_RESERVATION_RELEASED: 'inventory.reservation.released',
  REFUND_CREATED: 'refund.created',
  SELLER_INVITE_CREATED: 'seller.invite.created',
} as const;

export type OutboxEventType =
  (typeof OUTBOX_EVENT_TYPES)[keyof typeof OUTBOX_EVENT_TYPES];
