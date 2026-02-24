# ADR-006 Pending to Available Release Policy

Date: 2026-02-24  
Status: Accepted

## Context
Seller payoutability zamanlamasi finansal risk ve cashflow dengesini etkiler.

## Decision
- Seller alacagi order COMPLETED oldugunda pending olur.
- T+7 scheduler ile pending -> available gecisi yapilir.
- Release job idempotent calisir.

## Consequences
- Refund riski azalarak payout disiplini korunur.
- Scheduler ve state-transition testleri zorunlu olur.
