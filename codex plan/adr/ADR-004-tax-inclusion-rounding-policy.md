# ADR-004 Tax Inclusion and Rounding Policy

Date: 2026-02-24  
Status: Accepted

## Context
TR Faz-1 icin vergi ve rounding belirsizligi kurus farki krizine neden olur.

## Decision
- Tax mode: KDV dahil fiyatlama.
- Currency scale: TRY=2 decimal, integer cents.
- Rounding mode: HALF_UP.
- Policy hedefi: rounding finalize adiminda uygulanir.

## Consequences
- Hesaplama davranisi deterministik olur.
- Step bazli implementationda finalize hedefi korunarak sade gecis gerekir.
