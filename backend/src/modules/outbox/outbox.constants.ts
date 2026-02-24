export const OUTBOX_EVENT_TYPES = {
  ORDER_CREATED: 'order.created',
  PAYMENT_CREATED: 'payment.created',
  PRODUCT_PUBLISH_CHANGED: 'product.publish.changed',
  SELLER_INVITE_CREATED: 'seller.invite.created',
} as const;

export type OutboxEventType =
  (typeof OUTBOX_EVENT_TYPES)[keyof typeof OUTBOX_EVENT_TYPES];
