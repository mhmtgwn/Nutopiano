# Nutopiano Master Plan (Single Source of Truth)

Tarih: 24 Subat 2026  
Versiyon: 1.0  
Durum: Aktif master plan (`codex plan/PLAN.md`)

## 1) Amac, Kapsam, Faz Siniri

Bu dosya Nutopiano icin tek aktif plan kaynagidir. Hedef, Faz-1 kapsaminda Shopify+POS+Finance Core sistemini finansal dogrulukla canliya almak ve Faz-2 global genisleme icin rewrite gerektirmeyen altyapi kurmaktir.

Faz-1 kapsam:
- Seller onboarding
- Marketplace gezinti (market -> seller -> category -> product)
- Online satis (cart -> checkout -> order)
- POS satis (offline-first queue + sync)
- Gun sonu ve finance raporlari
- Snapshot freeze, immutable ledger, payout ve refund minimal

Faz-2 ve sonrasi:
- Advanced pricing/rule builder
- Multi-currency runtime
- Multi-region VAT runtime
- Domain-specific extensionlar (Uber/Booking vb.)

## 2) Kilit Kararlar

| Alan | Karar |
|---|---|
| Rol modeli | Teknik canonical rol `USER`, `STAFF` geri gelmez |
| Money precision | TRY scale=2, tum hesaplar integer cents |
| Rounding | Sadece `finalizeStep`, mode=`HALF_UP` |
| Refund rounding | Orijinal snapshot degerleriyle birebir tersleme |
| Commission base | Indirim sonrasi KDV haric net taban |
| Calculation version | `v1:` + canonical JSON + SHA256 |
| Ledger modeli | Strict double-entry |
| Ledger invariant | Event-level ve daily-level `sum(entries)=0` |
| Pending -> Available | `COMPLETED + T+7` scheduler |
| Idempotency scope | `(businessId, operation, channel, idempotencyKey)` + payload hash |
| Refund + paid payout | Negative wallet + auto recovery/mahsup |
| Tx modeli | Read Committed + `SELECT ... FOR UPDATE` wallet lock |
| Shadow mode | 30 gun old/new compare, reject etmeden log |
| Performans | `POST /orders` P95 `< 500ms` |

## 3) Mimari Katmanlar (Core / TR / Extension)

### 3.1 Commerce Core (immutable)
- Order engine
- Calculation pipeline
- Snapshot freeze
- Ledger/wallet/payoutability
- Refund minimal
- Audit trail

### 3.2 TR Adaptation
- KDV 1/8/20
- TRY
- Basic commission ve discount rule set

### 3.3 Extension Layer
- Multi-tax/multi-currency/local compliance
- Domain-specific pricing hooks
- Tier commission ve split settlement

## 4) Veri Modeli ve API/Interface Etkileri

### 4.1 Order alanlari
- `platformRevenueCents`
- `sellerPayoutCents`
- `currency`
- `calculationProfileId`
- `calculationVersion`
- `breakdownJson`
- `priceMismatch`
- `priceMismatchMetaJson`
- `countryCode`
- `taxProfileCode`
- `commissionProfileCode`

### 4.2 Rule ve finance modelleri
- `CalculationProfile`
- `SellerChannelRuleBinding`
- `CommissionRule`
- `CommissionCategoryOverride`
- `TaxRuleTR`
- `LedgerEntry` (immutable journal)
- `SellerWallet`
- `PlatformWallet`
- `PayoutRequest`

### 4.3 Public API etkileri (dokumantasyon kapsami)
- `POST /orders` request: `operation`, `channel`, `registerSessionId?`, `registerCode?`, `items[].expectedUnitPriceCents?`
- `POST /orders` response: `currency`, `calculationVersion`, `platformRevenueCents`, `sellerPayoutCents`, `priceMismatch`, `breakdownJson`
- Rule profile admin API: `GET/POST/PATCH /platform/commerce/rule-profiles`, `PUT /platform/commerce/sellers/:sellerId/channels/:channel/profile`
- Risk API: `GET /platform/risk/price-mismatches`
- Finance health API: `GET /platform/finance/health`
- Seller onboarding API: `POST /sellers/applications`, `GET /sellers/applications/me`, `PATCH /platform/sellers/applications/:id`

## 5) Calculation Engine, Precision, Rounding, Hash

Pipeline:
1. pricing
2. discount
3. tax
4. commission
5. delivery
6. rounding
7. finalize

Kurallar:
- Step'ler pure olur, side-effect olmaz.
- Tum step ciktilari breakdown'a yazilir.
- Ara hesaplar integer cents olarak tutulur.
- Rounding sadece finalize adiminda `HALF_UP`.
- KDV dahil modelde brut fiyattan net+tax ayrisimi yapilir.

CalculationVersion:
- Hash payload: step order + rule profile + commission snapshot + tax profile + rounding policy + discount rules
- Canonical JSON stringify
- SHA256
- Format: `v1:<hex-digest>`

## 6) Ledger, Wallet, Payout, Refund Kurallari

Ledger:
- Strict double-entry
- Append-only (update/delete yok)
- Her event dengeli kayit uretir

Wallet:
- `pending`, `available`, `reserve`
- Postingte atomic update
- Ledger ile reconcile edilebilir

Payout:
- Status: `REQUESTED -> APPROVED -> PAID -> REJECTED`
- `COMPLETED + T+7` sonrasi available bakiye esas alinir

Refund:
- Original snapshot bazli ters kayit
- Paid payout sonrasinda negative wallet olusabilir
- Sonraki payoutlarda otomatik mahsup uygulanir

## 7) POS ve Channel Kurallari

- POS create order icin aktif register session zorunlu (session yoksa 422)
- Offline queue retry + idempotent sync
- Price mismatch policy: `ACCEPT + FLAG` (siparis reddi yok)
- Mismatch metadata audit/risk ekranina duser
- Channel farki:
  - POS: expected unit price kabul eder
  - Marketplace/Online: server price source-of-truth

## 8) Admin/Finance Control ve Monitoring

Control:
- Capability bazli UI gating
- Critical aksiyonlarda reason + audit zorunlu
- Payout/process lock ve conflict resolution standardi

Monitoring:
- Ledger imbalance widget
- Negative wallet detection
- High mismatch rate alarm
- Payout aging list
- Daily revenue vs ledger delta

## 9) 90 Gunluk Takvim (Tek Akis)

| Hafta | Cikti |
|---|---|
| 1 | ADR-001..007, core skeleton, karar kilitleme |
| 2 | Rule profile schema + binding + CRUD |
| 3 | Tax/discount/commission/rounding ve deterministic hash |
| 4 | Snapshot alanlari + core regression testleri |
| 5 | Strict double-entry ledger + wallet tx modeli |
| 6 | Idempotency scope migration + POS mismatch accept/flag |
| 7 | Seller onboarding + admin approve/reject |
| 8 | Checkout/channel entegrasyonu + UAT bugfix |
| 9 | Payout lifecycle + release policy |
| 10 | Refund reverse-ledger + race guards |
| 11 | Monitoring dashboard + performance hardening |
| 12 | Shadow report + cutover dry-run + rollback rehearsal |

## 10) Test ve DoD

Test senaryolari:
1. Money precision drift testi
2. CalculationVersion deterministic hash testi
3. Snapshot freeze regression
4. Ledger invariant event/day testi
5. Idempotency scope testi
6. POS mismatch accept+flag e2e
7. Session gate e2e
8. Pending->available scheduler testi
9. Refund+payout race testi
10. Performance (P95 < 500ms)

Faz-1 DoD:
1. Deterministic pipeline aktif
2. Snapshot freeze dogrulanmis
3. Strict double-entry ledger ve invariant check aktif
4. Pending->available policy yazili ve testli
5. Offline sync duplicate-free
6. Monitoring widget seti aktif
7. Shadow compare tolerans kriterinde

## 11) Cutover, Shadow, Backfill

- T-14: schema deploy, feature flag kapali
- T-10: shadow compare acik (write yok)
- T-7: delta rapor takibi
- T0: yeni siparislerde ledger write aktif
- T+1..T+30: rolling backfill + union-read reconciliation
- Delta stabil oldugunda legacy fallback daraltilir

## 12) UX/UI Mimari (Yeni)

### 12.1 Sistem Kimligi ve Persona Matrisi
Sistem yalnizca e-ticaret arayuzu degildir; Shopify+POS+Finance Core+Risk Monitor butunudur.

Persona:
- Seller (operasyon odakli)
- Finance/Admin (kontrol ve risk odakli)
- POS kullanicisi (hiz ve hata toleransi odakli)

### 12.2 Genel UX Felsefesi ve Bilgi Mimarisi
Asagidaki 4 alan birbirine karismamalidir:
1. Operasyon
2. Para
3. Risk
4. Sistem

Ana nav:
- Dashboard
- Commerce
- Finance
- Risk & Audit
- Settings

UI dili:
- Zemin: beyaz
- Blok arkaplan: acik gri
- Gelir: yesil
- Notr: mavi
- Bekleyen: turuncu
- Risk: kirmizi
- Font: Inter veya Geist
- Ton: sade, guven veren, dusuk gorsel gurultu

Faz-1 hizli okunabilirlik kriteri (3 saniye):
- Ne sattim?
- Ne kazandim?
- Ne kadar komisyon kesildi?
- Param ne zaman hesaba gececek?
- Risk var mi?

### 12.3 Seller Panel Akislari ve Ekran Hiyerarsisi
Sidebar:
- Dashboard / Orders / Products / POS / Customers / Reports / Payouts

Seller dashboard:
- Today Sales, Today Orders, Pending Balance, Available Balance
- Son 10 siparis listesi
- Kucuk mismatch badge
- Son payout request durumu

Orders list kolonlari:
- Order No, Channel, Status, Total, Commission, Seller Net, Mismatch, Created At

Order detail sekmeleri:
1. Summary
2. Calculation Breakdown (expandable)
3. Ledger Entries (default kapali)
4. Audit Log

Kural:
- Kullanici her kurusun hesabini gorebilmeli, sistem kara kutu hissettirmemeli.

### 12.4 POS Ekrani, Session Gate, Offline Banner, Mismatch Modal
Ana layout:
- Ust bar: aktif kasa badge + offline gostergesi
- Sol: urun grid + kategori chip filtre
- Sag: sepet + indirim + toplam + odeme butonu

Session gate:
- Vardiya baslatma zorunlu
- Kasa kodu + acilis sayimi olmadan satis ekrani acilmaz

Offline UX:
- Baglanti kesik: sari banner, kuyruga alinan islem sayisi
- Baglanti geri: yesil banner, senkronize edilen islem sayisi
- Queue detay: Order ID, Retry Count, Last Error, Status

Price mismatch modal:
- Siparis bloke edilmez
- Bilgilendirme metni + `Devam Et` / `Iptal`
- Islem risk paneline kaydedilir

### 12.5 Admin/Finance Paneli
Sidebar:
- Overview / Orders / Ledger / Wallets / Payouts / Refunds / Mismatch Monitor / Audit / Settings

Overview widgetlar:
- Total Platform Revenue (Today)
- Seller Pending Total
- Seller Available Total
- Open Payout Requests
- Refund Volume
- Price Mismatch Rate
- Ledger Invariant (OK + last check)

Ledger ekrani:
- Timestamp, Account Type, Direction, Amount, Order, Type, Reference
- Filtreler: Seller, Tarih, Tip, Channel

Wallet ekrani:
- Pending, Available, Total Earned, Total Paid Out
- Ledger-derived activity timeline

Payout ekrani:
- Seller, Requested Amount, Available, Status, Created, Actions
- Actions: Approve / Reject / Mark as Paid
- Mark as Paid modalinda immutable ledger etkisi acik ve ciddi sekilde vurgulanir

Refund ekrani:
- Original snapshot gostergeleri
- Refund hesaplama sonucu
- Ledger entries preview

Settings minimal:
- Rule profile secimi
- Rule hash
- Calculation version
- Active profile badge

### 12.6 Kritik UX Kararlari
1. Calculation breakdown her zaman expand edilebilir.
2. Immutable etki yaratan onaylarda ciddi modal dili kullanilir.
3. POS offline durumu surekli gorunur.
4. Mismatch uyari modalinda satis bloke edilmez.
5. Seller ve Finance panel mental modeli net ayrilir.

## 13) Legacy References

Bu dosya tek aktif plan kaynagidir.

Legacy referans:
- `codex plan/PLAN2.md` kaldirildi (24 Subat 2026), tek aktif kaynak `codex plan/PLAN.md`

Legacy notlar:
- Mevcut `Commission/Payout` tablolari gecis surecinde read-fallback olabilir.
- Cutover rolling backfill stratejisi ile yonetilir.

## 14) Execution Queue (Live)

Status legend:
- `DONE`: Tamamlandi
- `IN_PROGRESS`: Aktif gelistirme
- `QUEUED`: Kuyrukta

Queue:
1. `DONE` Plan konsolidasyonu: tek master plan + UX/UI entegrasyonu
2. `DONE` Plan temizligi: gereksiz plan/checklist dosyalarinin kaldirilmasi
3. `DONE` Week-1: Commerce core skeleton + calculation contracts + pipeline iskeleti
4. `DONE` Week-1: ADR dokumanlarinin repo icinde olusturulmasi (`ADR-001..007`)
5. `DONE` Week-2: Rule profile veri modeli + Prisma migration + CRUD endpointleri
6. `DONE` Week-3: Tax/commission adimlarinin production-grade kurallarla sertlestirilmesi
7. `DONE` Week-4: Snapshot alanlarinin order create akisina tam entegrasyonu
8. `DONE` Week-5: Strict double-entry ledger persistence + wallet atomic posting
9. `DONE` Week-6: Idempotency scope migration + POS mismatch accept/flag backend enforcement
10. `DONE` Week-7: Seller onboarding application flow + admin approve/reject
11. `DONE` Week-8: Checkout/channel profile secimi + UAT bugfix batch
12. `DONE` Week-9: Payout lifecycle + release policy scheduler
13. `DONE` Week-10: Refund reverse posting + payout race guard
14. `DONE` Week-11: Finance monitoring dashboard ve health endpointleri
15. `DONE` Week-12: Shadow compare, cutover rehearsal, rollback runbook
16. `IN_PROGRESS` UI/UX rollout: Seller Orders 4-tab detail (summary/breakdown/ledger/audit)
17. `IN_PROGRESS` UI/UX rollout: Admin Finance control center (overview/ledger/wallets/refunds/mismatch)
18. `IN_PROGRESS` UI/UX rollout: POS session gate + offline banner + mismatch modal + queue detail table
19. `QUEUED` UI/UX rollout: Payout actions finalize (approve/reject/mark as paid with immutable warning modal)
20. `QUEUED` Build verification + release candidate packaging
21. `QUEUED` Production deployment and post-deploy smoke check
