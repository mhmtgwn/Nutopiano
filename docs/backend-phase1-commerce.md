# Backend Phase 1 Commerce Standardization

This document records the Phase 1 additive contracts introduced for the
Shopify Lite + POS roadmap.

## New additive data model

- `Order.lifecycleState`
- nullable `storeId` on `Customer`, `Product`, `Order`, `Payment`
- `PaymentTransaction`
- `Refund`

## Internal ports

- `CatalogReadPort`
- `InventoryPort`
- `PricingPort`
- `PaymentsPort`
- `StoreContextPort`
- `OrderLifecyclePolicy`
- `SearchPort`

## Plugin extension points

- `PaymentPlugin`
- `ShippingPlugin`
- `AnalyticsPlugin`
- `MarketplacePlugin`

These are contract-only in Phase 1. No dynamic loading or app marketplace is enabled yet.

## Outbox event catalog

See [outbox-event-catalog.ts](/Users/notop/OneDrive/Masaüstü/Nutopiano/backend/src/modules/outbox/outbox-event-catalog.ts).

Canonical events:

- `catalog.product.updated`
- `inventory.stock.adjusted`
- `inventory.reservation.created`
- `inventory.reservation.released`
- `order.created`
- `order.status.changed`
- `order.cancelled`
- `payment.session.created`
- `payment.captured`
- `payment.failed`
- `refund.created`

## Queue policy

Phase 1 standardizes async jobs on BullMQ retry semantics through
`STANDARD_QUEUE_JOB_OPTIONS`.

Current adopters:

- payments webhook processing

More queues can migrate to the same policy without changing job payloads.
