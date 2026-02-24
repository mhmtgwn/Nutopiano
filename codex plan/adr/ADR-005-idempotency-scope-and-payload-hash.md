# ADR-005 Idempotency Scope and Payload Hash

Date: 2026-02-24  
Status: Accepted

## Context
POS retry ve channel farklari duplicate/false-conflict riski uretir.

## Decision
Idempotency unique scope:
- businessId
- operation
- channel
- idempotencyKey

Ek kontrol:
- payload hash
- key ayni + hash farkli ise 409 Conflict

## Consequences
- Retry guvenligi artar.
- Channellar arasi key cakismasi azalir.
