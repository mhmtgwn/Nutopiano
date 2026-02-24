# ADR-007 Refund and Payout Race Handling

Date: 2026-02-24  
Status: Accepted

## Context
Refund onayi ile payout paid islemi ayni anda tetiklenebilir.

## Decision
- Paid payout geriye alinmaz.
- Refund seller available yetersizse negative wallet olusturabilir.
- Recovery/mahsup sonraki payoutlarda otomatik uygulanir.
- Islem audit ve risk monitor tarafina yazilir.

## Consequences
- Operasyonel surec netlesir.
- Negative wallet izleme ve alarm zorunlu olur.
