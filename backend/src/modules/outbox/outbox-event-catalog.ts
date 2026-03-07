import { OUTBOX_EVENT_TYPES } from './outbox.constants';

export type OutboxEventCatalogEntry = {
  aggregateType: string;
  description: string;
  payloadShape: Record<string, string>;
};

export const OUTBOX_EVENT_CATALOG: Record<string, OutboxEventCatalogEntry> = {
  [OUTBOX_EVENT_TYPES.CATALOG_PRODUCT_UPDATED]: {
    aggregateType: 'PRODUCT',
    description:
      'Product catalog data changed and downstream projections may refresh.',
    payloadShape: {
      productId: 'number',
      isPublished: 'boolean',
      isActive: 'boolean',
      actorUserId: 'number',
    },
  },
  [OUTBOX_EVENT_TYPES.INVENTORY_STOCK_ADJUSTED]: {
    aggregateType: 'INVENTORY',
    description: 'Legacy stock was adjusted through the inventory port.',
    payloadShape: {
      productId: 'number',
      variantId: 'number|null',
      quantityDelta: 'number',
      reason: 'string',
      storeId: 'number|null',
    },
  },
  [OUTBOX_EVENT_TYPES.INVENTORY_RESERVATION_CREATED]: {
    aggregateType: 'INVENTORY',
    description: 'Inventory reservation was created for an order or POS flow.',
    payloadShape: {
      orderId: 'number',
      productId: 'number',
      variantId: 'number|null',
      quantity: 'number',
      storeId: 'number|null',
    },
  },
  [OUTBOX_EVENT_TYPES.INVENTORY_RESERVATION_RELEASED]: {
    aggregateType: 'INVENTORY',
    description: 'Previously reserved inventory was released.',
    payloadShape: {
      orderId: 'number',
      productId: 'number',
      variantId: 'number|null',
      quantity: 'number',
      storeId: 'number|null',
      reason: 'string',
    },
  },
  [OUTBOX_EVENT_TYPES.ORDER_CREATED]: {
    aggregateType: 'ORDER',
    description: 'A new order was created.',
    payloadShape: {
      orderId: 'number',
      customerId: 'number',
      sellerId: 'number|null',
      storeId: 'number|null',
      source: 'string',
      lifecycleState: 'string',
    },
  },
  [OUTBOX_EVENT_TYPES.ORDER_STATUS_CHANGED]: {
    aggregateType: 'ORDER',
    description: 'Business-visible order status changed.',
    payloadShape: {
      orderId: 'number',
      storeId: 'number|null',
      fromStatusKey: 'string|null',
      toStatusKey: 'string',
      lifecycleState: 'string',
    },
  },
  [OUTBOX_EVENT_TYPES.ORDER_CANCELLED]: {
    aggregateType: 'ORDER',
    description: 'Order reached the cancelled lifecycle state.',
    payloadShape: {
      orderId: 'number',
      storeId: 'number|null',
      lifecycleState: 'string',
    },
  },
  [OUTBOX_EVENT_TYPES.PAYMENT_SESSION_CREATED]: {
    aggregateType: 'PAYMENT_SESSION',
    description: 'External payment provider session was initialized.',
    payloadShape: {
      orderId: 'number',
      token: 'string',
      provider: 'string',
      conversationId: 'string|null',
    },
  },
  [OUTBOX_EVENT_TYPES.PAYMENT_CAPTURED]: {
    aggregateType: 'PAYMENT',
    description: 'A payment was captured or recorded successfully.',
    payloadShape: {
      paymentId: 'number',
      paymentTransactionId: 'number',
      orderId: 'number',
      storeId: 'number|null',
      amountCents: 'number',
      method: 'string',
      provider: 'string|null',
    },
  },
  [OUTBOX_EVENT_TYPES.PAYMENT_FAILED]: {
    aggregateType: 'PAYMENT',
    description: 'A provider-side payment session failed.',
    payloadShape: {
      orderId: 'number',
      token: 'string',
      provider: 'string',
    },
  },
  [OUTBOX_EVENT_TYPES.REFUND_CREATED]: {
    aggregateType: 'REFUND',
    description: 'A refund record and refund transaction were created.',
    payloadShape: {
      refundId: 'number',
      paymentId: 'number',
      paymentTransactionId: 'number',
      orderId: 'number',
      storeId: 'number|null',
      amountCents: 'number',
      method: 'string',
      provider: 'string|null',
    },
  },
};
