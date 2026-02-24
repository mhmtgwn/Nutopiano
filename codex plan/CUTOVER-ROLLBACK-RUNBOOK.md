# Cutover And Rollback Runbook (Week-12)

Tarih: 24 Subat 2026  
Kapsam: Commerce Core snapshot + ledger + payout lifecycle cutover

## 1) Pre-Cutover Checklist (T-14 -> T-1)

1. Prisma migration plani freeze edilir (`backend/prisma/migrations/*`).
2. `npm run build -w backend` ve kritik testler yesil olur.
3. `dev/shadow-compare` raporu son 7 gun icin alinip mismatch trendi kaydedilir.
4. Finance health endpointleri (`/platform/finance/health`) 24 saat boyunca takip edilir.
5. Cutover sirasi ve rollback sorumlulari net atanir.

## 2) Cutover Execution (T0)

1. Uygulamayi maintenance moda al.
2. Migrationlari uygula.
3. API podlarini yeni surume al.
4. Smoke test:
   - `POST /orders` (POS + marketplace)
   - `POST /seller/finance/payout-request`
   - `PATCH /platform/finance/payouts/:id/complete`
   - `PATCH /platform/return-requests/:id/resolve`
5. `GET /platform/finance/health` ile:
   - `ledgerInvariant.ok=true`
   - `deltaCents` kabul edilen aralikta

## 3) Post-Cutover Verification (T0 -> T+1h)

1. Son 50 order icin snapshot alanlari dolu mu kontrol et:
   - `calculationVersion`
   - `breakdownJson`
   - `platformRevenueCents`
   - `sellerPayoutCents`
2. Son 50 order icin `FinanceLedgerEntry` event bazinda debit=credit kontrol et.
3. POS mismatch akisinda order reject edilmeden `priceMismatch=true` set edildigini dogrula.
4. Payout request -> approve -> paid akisinda wallet/ledger mutabakatini kontrol et.

## 4) Rollback Trigger Kriterleri

Rollback tetiklenir eger:

1. `ledgerInvariant.ok=false` ve 15 dakika icinde toparlanmiyorsa
2. `POST /orders` hata orani %5 ustune cikarsa (5 dakikalik pencere)
3. Finance health `deltaCents` beklenmeyen sekilde hizla buyurse
4. Idempotency kaynakli duplicate order tespit edilirse

## 5) Rollback Adimlari

1. Trafigi eski backend surumune yonlendir.
2. Yeni surum podlarini drain et.
3. Feature flag ile yeni ledger posting yolunu kapat.
4. Cutover sonrasi yazilan eventleri raporla:
   - `FinanceLedgerEntry` son event araligi
   - etkilenen order id listesi
5. Incident kaydi ac ve root-cause calismasina gec.

## 6) Recovery Sonrasi

1. Shadow compare raporunu tekrar calistir.
2. Sorun cozuldugunde dry-run ortaminda ayni adimlari tekrar et.
3. Yeni cutover penceresi planla.
