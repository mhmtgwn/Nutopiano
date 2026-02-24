# ADR-002 Ledger Accounting Model

Date: 2026-02-24  
Status: Accepted

## Context
Finance core icin audit edilebilir ve tutarli bir muhasebe modeli gerekir.

## Decision
- Ledger strict double-entry olacak.
- Her finansal olay event-level dengeli kayit uretecek.
- Ledger append-only olacak (update/delete yok).
- Invariant: event-level ve daily-level `sum(entries)=0`.

## Consequences
- Reconciliation dogrulugu artar.
- Posting isleminde transaction ve lock disiplini zorunlu olur.
