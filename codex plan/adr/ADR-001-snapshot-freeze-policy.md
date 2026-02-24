# ADR-001 Snapshot Freeze Policy

Date: 2026-02-24  
Status: Accepted

## Context
Order finansallari kural degisikliklerinden etkilenmemelidir.

## Decision
Order create aninda hesaplama sonucu snapshot alanlariyla birlikte kalici yazilir:
- subtotal
- discount
- tax
- commission
- payout/revenue
- breakdown
- calculationVersion

Snapshot yazildiktan sonra recalculation yapilmaz.

## Consequences
- Refund ve payout islemleri snapshot referansli calisir.
- Gecmis orderlar kural degisikliginde degismez.
