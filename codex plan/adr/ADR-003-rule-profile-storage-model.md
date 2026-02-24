# ADR-003 Rule Profile Storage Model

Date: 2026-02-24  
Status: Accepted

## Context
Channel ve seller bazli hesaplama kurallari versioned ve denetlenebilir olmali.

## Decision
Rule storage normalize tablolarla tutulur:
- CalculationProfile
- SellerChannelRuleBinding
- CommissionRule
- CommissionCategoryOverride
- TaxRuleTR

JSON-only storage primary model olarak kullanilmaz.

## Consequences
- Query ve audit kolaylasir.
- Migration ve data model kapsamı buyur.
