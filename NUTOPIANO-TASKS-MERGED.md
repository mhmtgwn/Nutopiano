# Nutopiano — Tasks / Plans (Merged, Completed Removed)

Bu dosya repodaki plan/checklist/todo ağırlıklı markdown dosyalarının birleştirilmiş halidir. Tamamlanmış maddeler ayıklanmıştır (örn. [x], ✅, PASS).



---

## Source: codex plan\\PLAN.md

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
- `codex plan/PLAN2.md` (deprecated source, sadece tarihsel karsilastirma icin)

Legacy notlar:
- Mevcut `Commission/Payout` tablolari gecis surecinde read-fallback olabilir.
- Cutover rolling backfill stratejisi ile yonetilir.


---

## Source: codex plan\\PLAN2.md

> DEPRECATED SOURCE (24 Subat 2026):
> Bu dosya artik aktif plan degildir. Tek aktif master plan:
> `codex plan/PLAN.md`
> Bu dosya yalnizca tarihsel referans/karsilastirma icin tutulur.

# Nutopiano Commerce Core (TR First) — Revize 90 Gunluk Plan (Karar Tamamli)

## Ozet
- Hedef: 24 Subat 2026 - 25 Mayis 2026 arasinda Commerce Core'u deterministic hesaplama + snapshot freeze + immutable ledger ile Faz-1 canliya almak.
- Bu revizyon, ilettigin 7 kritik noktayi plan seviyesinde kapatir ve implementere karar birakmaz.
- Faz-1 scope korunur ve seller onboarding takvime resmi olarak eklenir.

## Kilitlenen Kararlar
| Baslik | Kilit Karar |
|---|---|
| Rol modeli | Teknik canonical rol `USER`; `STAFF` geri gelmeyecek |
| Rule profile storage | Normalize tablolar (JSON-only degil) |
| TR vergi modeli | `KDV dahil` fiyat modeli |
| Rounding | `Half-Up` (4-5) cent bazli |
| Seller onboarding | Faz-1 scope icinde, Hafta-7 teslim |
| Legacy cutover | Rolling backfill + union read |
| Performans hedefi | `POST /orders` P95 `< 500ms` |
| Commission tabani | Indirim sonrasi `KDV haric net` tutar |
| Payout availability | `isFinal=true` statuye gecince pending -> available |

## Public API / Interface Degisiklikleri
- `POST /orders` request DTO genisletilecek:
- `channel: MARKETPLACE | POS | MANUAL` (source map ile geriye uyumlu)
- `registerSessionId?: number`
- `registerCode?: string`
- `items[].expectedUnitPriceCents?: number` (mevcut alan korunur)
- `POST /orders` response genisletilecek:
- `currency`
- `calculationProfileId`
- `calculationVersion`
- `platformRevenueCents`
- `sellerPayoutCents`
- `priceMismatch`
- `breakdownJson`
- Yeni admin API grubu:
- `GET /platform/commerce/rule-profiles`
- `POST /platform/commerce/rule-profiles`
- `PATCH /platform/commerce/rule-profiles/:id`
- `PUT /platform/commerce/sellers/:sellerId/channels/:channel/profile`
- Yeni seller onboarding API:
- `POST /sellers/applications` (CUSTOMER/USER)
- `GET /sellers/applications/me`
- `PATCH /platform/sellers/applications/:id` (approve/reject)
- Risk izleme API:
- `GET /platform/risk/price-mismatches`
- Payout API state modeli netlestirilecek:
- `REQUESTED -> APPROVED -> PAID -> REJECTED`

## Veri Modeli (Prisma) Degisiklikleri
- Yeni tablolar:
- `CalculationProfile`
- `SellerChannelRuleBinding`
- `CommissionRule`
- `CommissionCategoryOverride`
- `TaxRuleTR`
- `SellerWallet`
- `PlatformWallet`
- `LedgerEntry`
- `PayoutRequest` (mevcut payout ile gecis katmani)
- `Order` alan eklentileri:
- `platformRevenueCents Int @default(0)`
- `sellerPayoutCents Int @default(0)`
- `currency String @default("TRY")`
- `calculationProfileId Int?`
- `calculationVersion String?`
- `breakdownJson Json?`
- `priceMismatch Boolean @default(false)`
- `priceMismatchMetaJson Json?`
- Legacy uyumluluk:
- `Commission` ve `Payout` tablolari silinmez.
- T0 sonrasi "write target" yeni ledger olur.
- Legacy tablolar rapor fallback katmaninda kalir.

## Calculation Engine Spesifikasyonu
- Pipeline: `pricing -> discount -> tax -> commission -> delivery -> rounding -> finalize`
- TR KDV dahil hesap:
- Input birim fiyat `gross` kabul edilir.
- `grossAfterDiscount` hesaplanir.
- `net = round_half_up(grossAfterDiscount * 10000 / (10000 + taxRateBps))`
- `tax = grossAfterDiscount - net`
- Commission:
- Base = indirim sonrasi net toplam.
- `percentage` ve `fixed` desteklenir.
- Category override varsa profile default'u ezer.
- Rounding:
- Tum adimlar integer cent ile tutulur.
- Float birikimini engellemek icin step ciktilari cent’e normalize edilir.
- Half-up disinda kural kullanilmaz.

## POS Kurallari (Faz-1)
- POS order create icin aktif kasa oturumu zorunlu.
- Oturum yoksa `422`.
- Price mismatch policy: `ACCEPT + FLAG`.
- `expectedUnitPriceCents` ile server fiyat farkinda siparis reddedilmez.
- `priceMismatch=true` set edilir.
- `priceMismatchMetaJson` ve `audit_log` yazilir.
- Offline queue sync idempotent kalir, duplicate order uretilmez.

## Seller Onboarding (Takvime Eklendi)
- Hafta-7 teslimi:
- Customer/User seller application olusturabilir.
- Application default `PENDING`.
- Admin `APPROVE` ettiginde seller profili `isActive=true`.
- User role gecisi bu anda `SELLER` olur.
- Reject durumunda mevcut rol korunur.

## Cutover ve Backfill Stratejisi
- T-14 gun: Yeni schema deploy, feature flag kapali.
- T-10 gun: Shadow calculation acik (write yok, compare var).
- T-7 gun: Legacy-vs-new fark raporu gunluk takip.
- T0 (19 Mayis 2026): Yeni siparislerde ledger write acilir.
- T+1 - T+30: Rolling backfill job:
- Batch bazli eski finalized order'lari ledger'a sentetik ama izlenebilir entry olarak tasir.
- Her batch sonrasinda reconciliation raporu uretilir.
- Okuma stratejisi:
- Ledger varsa ledger-first.
- Ledger yoksa legacy fallback.
- T+30: Backfill tamam ve fark yoksa legacy fallback pasiflestirilir.

## Takvim (Hafta Bazli)
- Hafta-1 (24 Subat - 2 Mart): ADR-001/002/003/004/005; role cleanup; README tutarlilik duzeltmesi backlog.
- Hafta-2 (3 Mart - 9 Mart): Rule profile schema + CRUD + seller/channel binding.
- Hafta-3 (10 Mart - 16 Mart): KDV dahil tax step + half-up rounding step + determinism testleri.
- Hafta-4 (17 Mart - 23 Mart): Commission step (net base) + snapshot alanlari + breakdown versioning.
- Hafta-5 (24 Mart - 30 Mart): Wallet + immutable ledger + order posting.
- Hafta-6 (31 Mart - 6 Nisan): POS session gate + mismatch accept/flag + risk endpoint.
- Hafta-7 (7 Nisan - 13 Nisan): Seller onboarding application flow + admin approve/reject.
- Hafta-8 (14 Nisan - 20 Nisan): Marketplace/checkout stabilization + channel profile secimi.
- Hafta-9 (21 Nisan - 27 Nisan): PayoutRequest lifecycle + pending/available gecisleri.
- Hafta-10 (28 Nisan - 4 Mayis): Refund minimal reverse-ledger (Model A).
- Hafta-11 (5 Mayis - 11 Mayis): Performance hardening ve index optimizasyonu.
- Hafta-12 (12 Mayis - 18 Mayis): UAT kapanis + cutover dry-run + rollback rehearsal.
- Buffer/Cutover (19 Mayis - 25 Mayis): T0 canliya alim + rolling backfill baslangici.

## Test Plani ve Kabul Kriterleri
- Unit:
- KDV dahil hesap dogrulama (1/8/20).
- Half-up rounding edge case’leri.
- Commission net-base senaryolari.
- Integration:
- Snapshot freeze (rule degisse de eski order sabit).
- POS mismatch accept+flag.
- Session gate 422 davranisi.
- Ledger append-only (update/delete yok).
- E2E:
- Offline queue sync duplicate-free.
- Payout state transition CAS.
- Refund ters kayit ve bakiye etkisi.
- Performance:
- k6 order senaryosu icin threshold: `POST /orders` P95 `< 500ms`, error rate `< 1%`.
- Olcum kosulu: staging, 30 VU, 5 dakika, order scenario aktif.

## Varsayimlar ve Defaultlar
- Faz-1 para birimi sadece `TRY`.
- `isFinal=true` status payout availability trigger'idir.
- Tax ve commission kurallari versioned profile ile belirlenir.
- `USER` teknik rol kalir; `STAFF` sadece tarihsel dokuman terimidir.
- Legacy raporlar cutover sonrasi gecici union-read ile korunur.


---

## Source: PLAN.md

# 🚀 NUTOPIANO - YAPILACAKLAR PLANI

**Tarih:** 21 Şubat 2026  
**Proje Durumu:** Beta - Production'a gitme hazırlığı

---

## 📊 ÖZET

- **Toplam Task:** 45
- **Kritik (🔴):** 8 task
- **Yüksek Öncelik (🟠):** 12 task
- **Orta Öncelik (🟡):** 15 task
- **Düşük Öncelik (🟢):** 10 task

**Estimated Time:** 3-4 hafta

---

## 🔴 HAFTA 1: KRİTİK FİXLER (Production Öncesi)

### Güvenlik Açıkları

**1.1. Order Controller'ı CUSTOMER'a Aç**
- **Dosya:** [backend/src/modules/orders/orders.controller.ts](backend/src/modules/orders/orders.controller.ts#L20)
- **Problem:** Frontend checkout `POST /orders` çağrıyor ama CUSTOMER role blocked
- **Fix:** `@Roles('ADMIN', 'STAFF')` → `@Roles('CUSTOMER', 'ADMIN', 'STAFF')`
- **Etkilenen Sayfalar:** Checkout flow (frontend)
- **Zaman:** 5 dakika
- **Status:** ⏳ Not started

---

**1.2. JWT Token HTTP-Only Cookie'ye Taşı**
- **Dosya 1:** [backend/src/auth/auth.controller.ts](backend/src/auth/auth.controller.ts#L35)
- **Dosya 2:** [frontend/src/services/api.ts](frontend/src/services/api.ts)
- **Problem:** Token localStorage'da XSS riski
- **Fix:** 
  - Backend: Response'a set-cookie header'ı ekle (zaten yapılıyor)
  - Frontend: localStorage yerine axios withCredentials kullan (zaten ayarlı)
  - Verify: Cookie secure, httpOnly, SameSite flags doğru
- **Zaman:** 30 dakika
- **Test:** Login → Token cookie'de var mı? localStorage'da yok mu?
- **Status:** ⏳ Not started

---

**1.3. Payment Amount Validasyonu**
- **Dosya:** [backend/src/modules/orders/orders.service.ts](backend/src/modules/orders/orders.service.ts#L771)
- **Problem:** Negative/zero/invalid amount kontrol yok
- **Fix:**
  ```typescript
  const amountCents = Number(payload.amount);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new BadRequestException('Amount must be positive number');
  }
  ```
- **Zaman:** 10 dakika
- **Status:** ⏳ Not started

---

**1.4. Rate Limiting - Login Endpoint**
- **Dosya:** [backend/src/auth/auth.controller.ts](backend/src/auth/auth.controller.ts#L34)
- **Problem:** Brute force saldırı mümkün
- **Çözüm Seçenekler:**
  - [ ] `@nestjs/throttler` package kur
  - [ ] IP-based rate limiting: 5 deneme / 15 dakika
  - [ ] Account lock: 3 başarısız sonrası 30 dakika lock
- **Dosya:** Yeni middleware `src/common/middleware/rate-limit.middleware.ts`
- **Zaman:** 45 dakika
- **Dependencies:** 
  - `npm install --save @nestjs/throttler`
  - `npm install --save express-rate-limit`
- **Status:** ⏳ Not started

---

**1.5. Logout Endpoint - Token Blacklist**
- **Dosya:** [backend/src/auth/auth.controller.ts](backend/src/auth/auth.controller.ts#L49)
- **Problem:** Logout'tan sonra token hala valid
- **Fix:** Redis/In-memory blacklist implement et
- **Zaman:** 1 saat
- **Status:** ⏳ Not started

---

**1.6. CORS Domain Validation**
- **Dosya:** [backend/src/main.ts](backend/src/main.ts)
- **Problem:** CORS '*' olabilir veya wildcard çok geniş
- **Fix:**
  ```typescript
  app.enableCors({
    origin: ['https://nutopiano.com', 'https://www.nutopiano.com'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });
  ```
- **Zaman:** 20 dakika
- **Status:** ⏳ Not started

---

**1.7. CSRF Tokens Implementation**
- **Dosya:** Yeni `src/common/middleware/csrf.middleware.ts`
- **Problem:** POST/PATCH/DELETE endpoint'leri CSRF riski taşıyor
- **Fix:** 
  - GET endpoint'ler CSRF token gönderir
  - POST/PATCH/DELETE token verification
  - Cookie: `__csrf` (httpOnly: false)
  - Header: `X-CSRF-Token`
- **Zaman:** 1.5 saat
- **Dependency:** `csurf` package
- **Status:** ⏳ Not started

---

**1.8. Input Sanitization - Order Notes**
- **Dosya:** [backend/src/modules/orders/dto/create-order.dto.ts](backend/src/modules/orders/dto/create-order.dto.ts)
- **Problem:** Order notes'lerde HTML/Script injection mümkün
- **Fix:**
  ```typescript
  import { IsString, MaxLength, Matches } from 'class-validator';
  
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^[^<>]*$/, { message: 'HTML tags not allowed' })
  notes?: string;
  ```
- **Zaman:** 15 dakika
- **Status:** ⏳ Not started

---

---

## 🟠 HAFTA 2: ÖDEME ENTEGRASYON (İyzico & PayTR)

### İyzico Integration

**2.1. İyzico SDK Setup**
- **Dosya:** Yeni `src/modules/payments/providers/iyzico.service.ts`
- **Task:**
  - [ ] `npm install --save iyzipay`
  - [ ] Environment variables:
    ```
    IYZICO_API_KEY=xxx
    IYZICO_SECRET_KEY=xxx
    IYZICO_BASE_URL=https://api.iyzipay.com  # or sandbox
    ```
  - [ ] Service class oluştur (`IyzicoService`)
  - [ ] Methods:
    - `initializePayment(order)` → payment URL döner
    - `verifyPayment(token)` → payment confirm eder
    - `refundPayment(transactionId)` → refund eder
- **Zaman:** 2 saat
- **Status:** ⏳ Not started

---

**2.2. PayTR Integration**
- **Dosya:** Yeni `src/modules/payments/providers/paytr.service.ts`
- **Task:**
  - [ ] `npm install --save axios` (already installed)
  - [ ] Environment variables:
    ```
    PAYTR_MERCHANT_ID=xxx
    PAYTR_MERCHANT_KEY=xxx
    PAYTR_MERCHANT_SALT=xxx
    PAYTR_API_URL=https://www.paytr.com/api
    ```
  - [ ] Service class oluştur (`PaytrService`)
  - [ ] Methods:
    - `initializePayment(order)` → token, URL döner
    - `verifyPayment(token, signature)` → HMAC verify
    - `getPaymentStatus(token)` → check status
- **Zaman:** 2 saat
- **Status:** ⏳ Not started

---

**2.3. Payment Provider Abstraction**
- **Dosya:** Yeni `src/modules/payments/interfaces/payment-provider.interface.ts`
- **Task:**
  ```typescript
  export interface IPaymentProvider {
    initializePayment(order: Order): Promise<{ url: string; token: string }>;
    verifyPayment(token: string): Promise<PaymentResult>;
    refundPayment(transactionId: string): Promise<RefundResult>;
  }
  ```
- **Zaman:** 30 dakika
- **Status:** ⏳ Not started

---

**2.4. Payments Module Refactor**
- **Dosya:** [backend/src/modules/payments/](backend/src/modules/payments/)
- **Task:**
  - [ ] Module oluştur (zaten var mı? check et)
  - [ ] `payments.controller.ts`:
    - `POST /payments/initialize` - Payment URL generate
    - `POST /payments/webhook/iyzico` - iyzico callback
    - `POST /payments/webhook/paytr` - PayTR callback
    - `GET /payments/:id/status` - Check payment status
  - [ ] `payments.service.ts`:
    - Payment provider selection logic
    - Webhook verification
    - Database update after payment
- **Zaman:** 2.5 saat
- **Status:** ⏳ Not started

---

**2.5. Webhook Endpoints**
- **Dosya:** `src/modules/payments/payments.controller.ts`
- **Task:**
  - [ ] iyzico webhook: `POST /webhooks/iyzico`
    - Signature verify (HMAC-SHA256)
    - Update Order status → PAID
    - Update Payment record
    - Send email notification
  - [ ] PayTR webhook: `POST /webhooks/paytr`
    - Signature verify (HMAC-SHA256)
    - Update Order status
    - Update Payment record
    - Send email notification
- **Warning:** Webhook'lar public (no auth required) olmalı ama signed
- **Zaman:** 1.5 saat
- **Status:** ⏳ Not started

---

**2.6. Payment Status Callback Email**
- **Dosya:** [backend/src/email/email.service.ts](backend/src/email/email.service.ts)
- **Task:**
  - [ ] Mail template: `payment-success.html`
  - [ ] Mail template: `payment-failed.html`
  - [ ] Method: `sendPaymentConfirmation(order, payment)`
  - [ ] Method: `sendPaymentFailed(order, error)`
  - [ ] Trigger: Payment webhook'tan sonra
- **Zaman:** 45 dakika
- **Status:** ⏳ Not started

---

**2.7. Order Status Update After Payment**
- **Dosya:** [backend/src/modules/orders/orders.service.ts](backend/src/modules/orders/orders.service.ts)
- **Task:**
  - [ ] Method: `markAsPaid(orderId, paymentId)`
  - [ ] Order status: CREATED → PAID
  - [ ] Update Payment.status → COMPLETED
  - [ ] Send confirmation email
  - [ ] Clear cart from frontend (via event/signal)
- **Zaman:** 30 dakika
- **Status:** ⏳ Not started

---

**2.8. Payment Verification Retry Logic**
- **Dosya:** Yeni `src/common/services/retry.service.ts`
- **Task:**
  - [ ] Webhook failed? → Retry 3x with exponential backoff
  - [ ] Database transaction rollback on failure
  - [ ] Logging her retry attempt'ı
- **Zaman:** 1 saat
- **Status:** ⏳ Not started

---

### Frontend Ödeme UI

**2.9. Checkout Payment Modal**
- **Dosya:** Yeni `frontend/src/components/checkout/PaymentModal.tsx`
- **Task:**
  - [ ] Provider seçimi (iyzico, PayTR)
  - [ ] Redirect to payment provider
  - [ ] Return URL handling
  - [ ] Success/failure states
- **Zaman:** 1.5 saat
- **Status:** ⏳ Not started

---

**2.10. Payment Success Page**
- **Dosya:** [frontend/src/app/checkout/page.tsx](frontend/src/app/checkout/page.tsx)
- **Task:**
  - [ ] Success confirmation UI (zaten var, improve et)
  - [ ] Order number, amount, status göster
  - [ ] Email confirmation nota
  - [ ] Download invoice link
- **Zaman:** 45 dakika
- **Status:** ⏳ Not started

---

**2.11. Payment Failure Handling**
- **Dosya:** Yeni `frontend/src/app/checkout/payment-failed/page.tsx`
- **Task:**
  - [ ] Error message göster
  - [ ] Retry button
  - [ ] Contact support link
  - [ ] Order status check link
- **Zaman:** 1 saat
- **Status:** ⏳ Not started

---

---

## 🟡 HAFTA 3: ÖDEME İYİLEŞTİRMELER & SECURITY

### Payment Advanced Features

**3.1. 3D Secure for High-Value Orders**
- **Dosya:** `src/modules/payments/payments.service.ts`
- **Task:**
  - [ ] Order amount > 1000 TL ise 3D Secure enforce et
  - [ ] iyzico 3D Secure flow
  - [ ] PayTR 3D Secure flow
- **Zaman:** 1.5 saat
- **Status:** ⏳ Not started

---

**3.2. Idempotency Keys for Duplicate Prevention**
- **Dosya:** `src/modules/payments/payments.controller.ts`
- **Task:**
  - [ ] Header: `Idempotency-Key` support ekle
  - [ ] Database: Payment table'ına `idempotencyKey` column ekle
  - [ ] Logic: Same key = return existing payment
  - [ ] Prevent: Double charge
- **Migration:** `20260310_add_idempotency_key`
- **Zaman:** 1 saat
- **Status:** ⏳ Not started

---

**3.3. Payment Refund API**
- **Dosya:** `src/modules/payments/payments.controller.ts`
- **Task:**
  - [ ] Endpoint: `POST /payments/:id/refund`
  - [ ] Only ADMIN can refund
  - [ ] Partial/Full refund support
  - [ ] Provider API call (iyzico/PayTR refund)
  - [ ] Update Order status → REFUNDED
- **Zaman:** 1.5 saat
- **Status:** ⏳ Not started

---

**3.4. Payment Transaction Logging**
- **Dosya:** Yeni `src/modules/payments/entities/payment-log.entity.ts`
- **Task:**
  - [ ] Database: `PaymentLog` table oluştur
    - paymentId, action, timestamp, status, response
  - [ ] Every API call log et (request, response)
  - [ ] Error logging
  - [ ] For audit trail
- **Zaman:** 45 dakika
- **Status:** ⏳ Not started

---

**3.5. Webhook Signature Verification Utility**
- **Dosya:** Yeni `src/common/utils/webhook-verify.util.ts`
- **Task:**
  ```typescript
  export function verifyIyzicoSignature(payload, signature): boolean;
  export function verifyPaytrSignature(payload, signature): boolean;
  ```
- **Zaman:** 30 dakika
- **Status:** ⏳ Not started

---

**3.6. Environment Variable Validation**
- **Dosya:** `src/main.ts` or `src/config/validation.ts`
- **Task:**
  - [ ] Startup'da payment env vars check et
  - [ ] Missing vars = application fail with clear error
  - [ ] Log which payment provider(s) enabled
- **Zaman:** 30 dakika
- **Status:** ⏳ Not started

---

**3.7. Crypto 3DS Code for iyzico**
- **Dosya:** `src/modules/payments/providers/iyzico.service.ts`
- **Task:**
  - [ ] 3DS authentication flow
  - [ ] MD5 hash generation for verification
  - [ ] Response validation
- **Zaman:** 1 saat
- **Status:** ⏳ Not started

---

**3.8. Payment Status Webhook Queue**
- **Dosya:** Yeni `src/modules/payments/queue/payment.processor.ts`
- **Task:**
  - [ ] Bull queue for async processing
  - [ ] Webhook received → Queue job
  - [ ] Retry failed jobs
  - [ ] Email notification async
- **Optional:** Can use sync for now
- **Zaman:** 1 saat
- **Status:** ⏳ Not started

---

### Data & Logging

**3.9. Order Payment History View**
- **Dosya:** `src/modules/orders/orders.service.ts`
- **Task:**
  - [ ] Method: `getOrderWithPayments(orderId)`
  - [ ] Return: Order + all payments + logs
  - [ ] Endpoint: `GET /orders/:id/full` (admin only)
- **Zaman:** 30 dakika
- **Status:** ⏳ Not started

---

**3.10. Payment Analytics Dashboard**
- **Dosya:** Yeni `src/modules/dashboard/payments.dashboard.ts`
- **Task:**
  - [ ] Total revenue (today, week, month)
  - [ ] Failed payments count
  - [ ] Average transaction time
  - [ ] Success rate by provider
- **Zaman:** 1.5 saat
- **Status:** ⏳ Not started

---

**3.11. Logging Middleware for Payments**
- **Dosya:** Yeni `src/common/middleware/payment-logger.middleware.ts`
- **Task:**
  - [ ] All payment requests log et
  - [ ] Sensitive data mask (card last 4 digit только)
  - [ ] Response status track et
- **Zaman:** 45 dakika
- **Status:** ⏳ Not started

---

**3.12. Transaction ID Generation**
- **Dosya:** `src/common/utils/transaction-id.util.ts`
- **Task:**
  - [ ] UUID + timestamp based transaction ID
  - [ ] Unique ID per payment attempt
  - [ ] Store in Payment record
- **Zaman:** 20 dakika
- **Status:** ⏳ Not started

---

**3.13. Payment Status Machine**
- **Dosya:** Yeni `src/modules/payments/payment.state-machine.ts`
- **Task:**
  - [ ] State flow: PENDING → PROCESSING → COMPLETED/FAILED
  - [ ] Prevent invalid transitions
  - [ ] Each state has allowed actions
- **Zaman:** 45 dakika
- **Status:** ⏳ Not started

---

---

## 🟢 EXTRA: STORAGE & COMPLIANCE

### Database Optimization

**4.1. Payment Index Optimization**
- **Файл:** `backend/prisma/schema.prisma`
- **Task:**
  - [ ] Index on Payment.orderId
  - [ ] Index on Payment.createdAt (for sorting)
  - [ ] Compound index: (businessId, orderId, status)
- **Migration:** `20260311_optimize_payment_indexes`
- **Zaman:** 30 dakika
- **Status:** ⏳ Not started

---

**4.2. Sensitive Data Encryption**
- **Dosya:** `src/common/utils/encryption.util.ts`
- **Task:**
  - [ ] Encrypt Payment.reference field (card token)
  - [ ] Encrypt in database, decrypt on read
  - [ ] Use `crypto` module
- **Zaman:** 1 saat
- **Status:** ⏳ Not started

---

**4.3. Payment Retention Policy**
- **Dosya:** `src/modules/payments/payment-cleanup.service.ts`
- **Task:**
  - [ ] Cron job: Old payment logs delete (after 1 year)
  - [ ] Keep Payment records forever (compliance)
  - [ ] Archive to cold storage (optional)
- **Zaman:** 45 dakika
- **Status:** ⏳ Not started

---

### Testing

**4.4. Payment Unit Tests**
- **Dosya:** `backend/test/payments.spec.ts`
- **Task:**
  - [ ] iyzico.service unit tests
  - [ ] paytr.service unit tests
  - [ ] Webhook signature verification tests
  - [ ] Mock payment provider responses
- **Zaman:** 3 saat
- **Status:** ⏳ Not started

---

**4.5. Payment E2E Tests**
- **Dosya:** `backend/test/payments.e2e-spec.ts`
- **Task:**
  - [ ] Test full payment flow (create order → initialize → webhook)
  - [ ] Test success scenario
  - [ ] Test failure scenario
  - [ ] Test retry logic
  - [ ] Use sandbox keys
- **Zaman:** 2 saat
- **Status:** ⏳ Not started

---

**4.6. Frontend Payment Tests**
- **Dosya:** `frontend/__tests__/checkout.test.ts` (new)
- **Task:**
  - [ ] Payment modal rendering
  - [ ] Provider selection
  - [ ] Success/failure handling
  - [ ] Mock API responses
- **Zaman:** 2 saat
- **Status:** ⏳ Not started

---

### Compliance & Documentation

**4.7. PCI DSS Compliance Check**
- **Dosya:** Documentation (SECURITY.md)
- **Task:**
  - [ ] Card data never stored in our DB
  - [ ] Payment reference only stored (tokenized)
  - [ ] HTTPS/TLS enforced
  - [ ] Audit logs maintained
  - [ ] Document security measures
- **Zaman:** 1.5 saat
- **Status:** ⏳ Not started

---

**4.8. API Documentation for Payments**
- **Dosya:** Update `backend/README.md`
- **Task:**
  - [ ] Payment endpoints documented
  - [ ] Webhook payload examples
  - [ ] Error codes list
  - [ ] Sandbox vs production guide
- **Zaman:** 1 saat
- **Status:** ⏳ Not started

---

**4.9. Environment Configuration Guide**
- **Dosya:** Yeni `PAYMENT-CONFIG.md`
- **Task:**
  - [ ] iyzico sandbox credentials setup
  - [ ] PayTR test keys setup
  - [ ] Webhook URL configuration
  - [ ] Testing checklist
- **Zaman:** 45 dakika
- **Status:** ⏳ Not started

---

**4.10. Deployment Checklist**
- **Dosya:** Yeni `DEPLOYMENT.md`
- **Task:**
  - [ ] Environment variables checklist
  - [ ] Database migrations run list
  - [ ] SSL certificate setup
  - [ ] Webhook URL verified
  - [ ] Logging setup confirmed
  - [ ] Backup strategy
- **Zaman:** 1 saat
- **Status:** ⏳ Not started

---

---

## 📋 DIĞER KRITIK SORUNLAR

### Code Quality & Security

**5.1. Stock Management - Already Working ✅**

---

**5.2. Customer Order Fetch - CUSTOMER Role Fix**
- **Dosya:** [backend/src/modules/orders/orders.service.ts](backend/src/modules/orders/orders.service.ts#L50)
- **Problem:** CUSTOMER sadece kendi siparişlerini görmeli
- **Fix:** Already implemented (findAllPaginated checks customer)

---

**5.3. Form Validation - Address Form**
- **Dosya:** `frontend/src/app/account/addresses/page.tsx`
- **Task:**
  - [ ] Address form validation add
  - [ ] Postal code format check
  - [ ] Phone format validation (TR)
  - [ ] City/District specific validation
- **Zaman:** 1 saat
- **Status:** ⏳ Not started

---

**5.4. Search & Filter API**
- **Dosya:** `backend/src/modules/products/products.controller.ts`
- **Task:**
  - [ ] Endpoint: `GET /products/search?q=piano&category=string` 
  - [ ] Filter by category, price range, stock
  - [ ] Full-text search (PostgreSQL)
  - [ ] Pagination support
- **Zaman:** 1.5 saat
- **Status:** ⏳ Not started

---

**5.5. Email Templates - HTML**
- **Dosya:** `backend/src/email/templates/`
- **Task:**
  - [ ] Order confirmation template
  - [ ] Payment success template
  - [ ] Payment failed template
  - [ ] Refund notification template
  - [ ] Password reset template (already exists?)
- **Zaman:** 1.5 saat
- **Status:** ⏳ Not started

---

**5.6. Admin Dashboard APIs**
- **Dosya:** `backend/src/modules/dashboard/`
- **Task:**
  - [ ] `GET /dashboard/stats` - Revenue, order count, etc.
  - [ ] `GET /dashboard/orders/recent` - Last 10 orders
  - [ ] `GET /dashboard/products/top` - Top sellers
  - [ ] `GET /dashboard/customers/new` - New customers
- **Zaman:** 2 saat
- **Status:** ⏳ Not started

---

---

## 🎯 TIMELINE ÖZETI

```
HAFTA 1 (21-27 Şubat 2026):
├─ Pazartesi: Tasks 1.1-1.3 (30 min + 10 min + 5 min)
├─ Salı: Tasks 1.4-1.5 (45 min + 1 hour)
├─ Çarşamba: Tasks 1.6-1.8 (20 min + 1.5 hour + 15 min)
└─ Perşembe: Testing & Verification

HAFTA 2 (28 Şub - 6 Mart 2026):
├─ İyzico Integration (Tasks 2.1-2.8)
├─ PayTR Integration
├─ Frontend Payment UI (Tasks 2.9-2.11)
└─ Testing

HAFTA 3 (7-13 Mart 2026):
├─ Advanced Payment Features (Tasks 3.1-3.8)
├─ Analytics & Logging (Tasks 3.9-3.13)
└─ Testing & Verification

HAFTA 4+ (14+ Mart 2026):
├─ Extra Features (Tasks 4.1-4.10)
├─ Testing (Tasks 4.4-4.6)
├─ Compliance (Tasks 4.7-4.10)
├─ Load Testing
└─ Production Preparation
```

---


Proje başlamasından önce:

- [ ] Gerekli npm packages kuruldu mu?
  - [ ] `npm install @nestjs/throttler`
  - [ ] `npm install express-rate-limit`
  - [ ] `npm install csurf`
  - [ ] `npm install iyzipay`
  - [ ] `npm install @nestjs/bull` (optional)
  - [ ] `npm install bull` (optional)
- [ ] Environment variables prepared?
  - [ ] IYZICO_API_KEY
  - [ ] IYZICO_SECRET_KEY
  - [ ] PAYTR_MERCHANT_ID
  - [ ] PAYTR_MERCHANT_KEY
  - [ ] PAYTR_MERCHANT_SALT
  - [ ] JWT_SECRET (.env'de)
- [ ] Database backup alındı mı?
- [ ] Git branch oluşturdum mu? (`feature/payment-integration`)
- [ ] İyzico sandbox account oluşturdum mu?
- [ ] PayTR test keys aldım mı?

---

## 📞 NOTES

### iyzico vs PayTR Farkları

| Feature | iyzico | PayTR |
|---------|--------|-------|
| **Setup Difficulty** | Easy | Easy |
| **3D Secure** | Built-in | Built-in |
| **Refund API** | Yes | Yes |
| **Fee** | ~2.5% | ~1.8% |
| **Settlement** | T+1 | T+1 |
| **Support** | TR & EN | TR only |

---

### Testing Strategy

1. **Local Development:** Sandbox keys + mock providers
2. **Staging:** Real sandbox environment
3. **Production:** Real production keys (käyttävät production flag)

---

### Common Pitfalls

❌ Don't:
- Test payment flow with real card
- Store card numbers anywhere
- Commit sensitive keys to git
- Skip webhook signature verification
- Trust only status code, verify signature

- Use sandbox environment for testing
- Store only tokenized references
- Use .env files with .gitignore
- Always verify webhook signatures
- Log all payment attempts (sensitive data masked)

---

## 📌 SONRAKI ADIMLAR

1. **Hafta 1 başlamadan önce:**
   - [ ] GitHub issue oluştur her task için
   - [ ] Assign developer(s)
   - [ ] Set up testing environment
   - [ ] Review & approve plan

2. **Daily:**
   - [ ] 09:00 - Team standup (10 min)
   - [ ] 17:00 - Daily review (15 min)
   
3. **Haftasonu:**
   - [ ] Code review
   - [ ] Test summary
   - [ ] Next week planning

4. **Daha Sonra Yapılacak (Ertelendi) — Cloudflare CDN (D-03):**
   - [ ] Cloudflare zone + registrar nameserver erişimi hazır
   - [ ] Origin server SSH erişimi ve public IP net
   - [ ] Mail DNS kayıtları (MX/SPF/DKIM/DMARC) envanteri çıkarıldı
   - [ ] `CLOUDFLARE.md` runbook adımlarıyla cutover uygulanacak
   - [ ] Cutover sonrası doğrulama: `https://nutopiano.com` ve `https://api.nutopiano.com/api/v1/health`

---

**Son Güncelleme:** 21 Şubat 2026  
**Hazırlayan:** Code Analysis Bot  
**Status:** 🟡 Ready for development


---

## Source: ADMIN-POS-UI-INFRA-PLAN.md

# Admin + POS UI Plan (Infra-First, V2)

Tarih: 24 Subat 2026
Durum: Sadece plan, implementasyon yok
Amac: Mevcut backend altyapisina birebir oturan, future-proof UI tasarim plani

## 1) Kapsam

Bu planin kapsami:
- `/admin`, `/platform`, `/pos` icin UI bilgi mimarisi
- Altyapiya birebir endpoint eslesmesi
- Permission/capability bazli UI gating modeli
- Concurrency, observability, incident, export governance, edge-case plani

Bu planin kapsami disi:
- Kod implementasyonu
- API contract degisikligi
- Veri modeli migration detaylari

## 2) Altyapi Baseline (Net)

### 2.1 Frontend guard ve route

- `ADMIN` -> `/admin/*` (`AdminGuard`)
- `SUPER_ADMIN` -> `/platform/*` (`AdminGuard requireSuperAdmin`)
- `SELLER/USER` -> `/dashboard/*` (`SellerGuard`)
- POS -> `/pos` (`SUPER_ADMIN/ADMIN/SELLER/USER`)

### 2.2 Backend capability kaynaklari

Admin/Platform:
- Dashboard: `/dashboard/summary`, `/dashboard/reports/summary`
- Seller ops: `/platform/sellers*`, `/seller/team/invites*`
- Override: `/platform/sellers/:sellerId/products/:id/publish-force`, `/platform/sellers/:sellerId/products/:id/stock-force`, `/users/:id/role/override`
- Outbox: `/platform/outbox/metrics`, `/platform/outbox/events`, `/platform/outbox/events/test`
- Finance: `/seller/finance/overview`, `/seller/finance/reports/users`, `/seller/finance/reports/products`, `/platform/finance/payouts*`

POS:
- Register: `/pos/register-session/current|history|open|close`
- Product: `/pos/products/barcode/:code`, `/pos/products/search`
- Customer: `/pos/customers/search`, `/pos/customers/:id`, `/pos/customers`
- Order/payment: `/orders`, `/orders/:id/payments`, `/pos/orders/:id/split-payment`, `/pos/orders/:id/apply-balance`, `/pos/orders/:id/return`, `/pos/orders/:id/invoice`
- Reports/export: `/pos/reports/end-of-day`, `/pos/reports/shifts`, `/pos/reports/staff-sales`, `/pos/reports/sales`, `/pos/reports/sales/export`

## 3) Permission Matrix Katmani (Role yerine Capability)

Amaç:
- UI gating'i rol stringine bagli olmaktan cikarip capability setine tasimak
- Gelecek persona setlerini API degismeden yonetebilmek

### 3.1 Permission Layer (Core)

- `VIEW_FINANCE`
- `EXECUTE_OVERRIDE`
- `VIEW_AUDIT`
- `MANAGE_SELLERS`
- `PROCESS_RETURN`
- `CLOSE_REGISTER`
- `FORCE_PUBLISH`
- `FORCE_STOCK`
- `VIEW_OUTBOX`
- `MANAGE_PAYOUT`
- `VIEW_REPORTS`
- `USE_POS`

### 3.2 Mevcut role -> capability esitligi (gecis modeli)

- `SUPER_ADMIN`: tum capability'ler
- `ADMIN`: `VIEW_FINANCE`, `MANAGE_SELLERS`, `VIEW_AUDIT`, `VIEW_OUTBOX`, `PROCESS_RETURN`, `CLOSE_REGISTER`, `MANAGE_PAYOUT`, kosullu `EXECUTE_OVERRIDE` (policy)
- `SELLER`: `USE_POS`, `PROCESS_RETURN`, `CLOSE_REGISTER`, `VIEW_REPORTS`, kisitli `VIEW_FINANCE`
- `USER`: `USE_POS`, kisitli `VIEW_REPORTS` (siparis odakli), opsiyonel `PROCESS_RETURN`
- `CUSTOMER`: panel capability yok

### 3.3 Gelecek persona paketleri (hedef)

- Finance-only admin: `VIEW_FINANCE`, `VIEW_REPORTS`, `MANAGE_PAYOUT`
- Support admin (override yok): `MANAGE_SELLERS`, `VIEW_OUTBOX`, `VIEW_AUDIT`
- Read-only auditor: `VIEW_AUDIT`, `VIEW_OUTBOX`, `VIEW_REPORTS`
- Limited seller staff: `USE_POS`, `VIEW_REPORTS`
- POS-only cashier: `USE_POS`, `CLOSE_REGISTER` yok

### 3.4 UI gating kurali

- Sol menu, route, buton, bulk action ve modal hepsi capability check ile acilir.
- Role sadece fallback olarak tutulur; asil kontrol capability matrix olur.

## 4) Bilgi Mimarisi (IA)

### 4.1 Admin IA (`/admin`, `/platform`)

1. Overview
- KPI, anomaly strip, ops health rail

2. Operations
- Orders, Payments, Services, Return queue

3. Catalog
- Categories, Products, publish/stock ops

4. Sellers and Team
- Sellers list, detail, applications, invite delivery

5. Finance
- Allocation-aware summary + reports + payout

6. Risk and Control
- Audit, Override center, Outbox monitor, Risk score

7. System
- Users, Plans, SMTP/SMS, Settings

### 4.2 POS IA (`/pos`)

1. Sale Workspace
- Scan/search, cart, totals, quick checkout

2. Payment Workspace
- Single/split/balance apply

3. Register Workspace
- Shift ribbon, open/close, history

4. Return Workspace
- Order lookup, reason, refund/restore

5. Reports Workspace
- EOD, shifts, staff sales, trend, csv export

6. Queue and Print Workspace
- Offline queue, retry, receipt, A4 invoice

## 5) Concurrency Strategy (Eksik Kritik Katman)

Hedef:
- Ayni entity uzerinde paralel islemde veri bozulmasini ve operator kaosunu engellemek

### 5.1 Order concurrency

- Order edit/payment islemlerinde optimistic lock version modeli
- UI her write call'da `version` gonderir
- Conflict durumunda `409` -> "Veri baska terminalde degisti" modal
- Modal aksiyonlari: `Yenile`, `Degisiklikleri birlestir`, `Iptal`

### 5.2 Register concurrency

- Server authority: tek aktif register session state'i backend belirler
- Close request'te lock owner bilgisi doner
- UI'da "Baska kullanici kapatma islemi baslatti" badge ve soft lock

### 5.3 Payout concurrency

- Payout satirinda `processing lock` state
- Admin bir satiri islerken diger adminler satiri readonly gorur
- Timeout fallback ile kilit temizlenir

### 5.4 Conflict resolution UI standardi

- Tum concurrency conflictleri tek ortak modal patterni ile gosterilir
- Teknik hata degil, operasyonel net mesaj gosterilir

## 6) Observability Layer UI

Amaç:
- Outbox disinda sistem sagligini admin panelde operasyonel hale getirmek

### 6.1 Overview "Ops Health Rail" kartlari

- Outbox backlog seviyesi (mevcut: `/platform/outbox/metrics`)
- Payment webhook process health (mevcut: `/payments/admin/webhook-events`)
- Payment provider latency badge (yeni metrik gerekir)
- SMTP/SMS delivery health (yeni aggregate endpoint gerekir)
- POS offline ratio (frontend telemetry + backend aggregate gerekir)
- Queue backlog severity indicator (offline queue + outbox toplami)

### 6.2 Veri kaynagi notu

- Bu katmanin bir kismi mevcut endpointlerle baslayabilir
- Tam hali icin health aggregate endpoint gerekecek

## 7) POS Performance + Offline-First Strategy

### 7.1 Cold Start Strategy

- Son 100 urun local cache
- En cok satilanlar prefetch cache
- Son 20 musteri prefetch cache
- Cache stale indicator UI

### 7.2 Offline-first Mode

- Order queue durability: local storage + retry metadata
- Print queue idempotency: fis tekrarinda duplicate engeli
- Payment retry rule: network recover oldugunda kontrollu retry
- Offline state bar: operator hangi modda oldugunu net gorur

### 7.3 Degradation matrix

- Online: tum feature acik
- Partial offline: satis + queue acik, provider bagimli islemler kilitli
- Full offline: sadece local queue ve print draft

## 8) Incident ve Support Mode

### 8.1 Support Mode (Enterprise)

- "View as seller" mode (read-only default)
- PII masking (phone/email partial blur)
- Session impersonation audit log zorunlu
- Time-boxed session (or. 15dk)

### 8.2 Guvenlik kurallari

- Support mode sadece capability ile acilir
- Her aksiyon audit'e "impersonatedBy" alanlariyla yazilir

## 9) UX Operational Modes

### 9.1 POS Focus Mode

- Sidebar collapse
- Full keyboard flow
- Visual noise reduction
- Checkout alaninda buyuk hedefler

### 9.2 Admin Bulk Action Mode

- Bulk publish
- Bulk stock update
- Bulk refund resolve (policy dahilinde)
- Bulk aksiyonlar icin staged preview + confirm

## 10) Risk and Control -> Risk Intelligence

### 10.1 Risk Score Badge

Risk score girdileri:
- Override yogunlugu
- Return anomaly
- Manual stock override frequency
- Outbox failed/dead-letter trend
- Webhook failed ratio

### 10.2 UI ciktisi

- Seller bazli risk badge
- Trend sparkline
- "Action recommended" paneli

## 11) Data Export Governance

Mevcut:
- `/pos/reports/sales/export`

Gerekli governance:
- Export audit log (kim, ne zaman, hangi filtre)
- Export rate limit
- Buyuk export icin async job
- Download link email delivery (signed URL, TTL)
- PII export policy badge

## 12) UX Edge Case Playbook

Plan zorunlu edge-case listesi:
- Zero-stock but force sale
- Negative balance apply
- Partial refund + split payment conflict
- Shift close with pending payment
- Duplicate barcode mismatch
- Offline order replay duplicate risk

Her edge-case icin:
- Beklenen backend response
- UI hata mesaji
- Operator eylem adimi

## 13) Multi-Tenant Boundary Netligi (Kritik Karar)

Mevcut kod gercegi:
- JWT icindeki `businessId` request context'e tasiniyor
- Prisma business-scoped modellerde `businessId` filtrelemesini zorunlu uyguluyor
- Bu nedenle mevcut davranista `SUPER_ADMIN` da pratikte business-scope icinde calisiyor

Karar ihtiyaci:
- `SUPER_ADMIN` cross-tenant gorecek mi, gormeyecek mi?

Secenek A:
- Strict tenant scope (mevcut davranis korunur)
- Daha guvenli, daha az karmasa

Secenek B:
- Cross-tenant SUPER_ADMIN
- Ayrik endpoint ve ayrik guard/policy gerekir
- UI tarafinda tenant switcher zorunlu olur

IA donusu etkisi:
- Cross-tenant secilirse `/platform` IA global operasyon paneline evrilir
- Secilmezse `/platform` business-level advanced admin kalir

## 14) Fazli Backlog (Onay Sonrasi)

Faz A (2 gun):
- Capability matrix spec
- IA wireframe
- Tenant boundary karari

Faz B (3-4 gun):
- Admin Overview + Ops Health Rail
- Risk and Control skeleton

Faz C (3-4 gun):
- Override/audit/outbox advanced UI
- Bulk action mode

Faz D (3-4 gun):
- POS workspace split + focus mode
- Cold start/offline state UX

Faz E (3-4 gun):
- Concurrency conflict modallari
- Return/register/payout lock UI

Faz F (2-3 gun):
- Export governance UI
- Edge-case UAT
- Final polish

## 15) Onay Icin Net Sorular

1. Capability-first modele gecisi onayliyor musun?
2. `SUPER_ADMIN` cross-tenant olacak mi, strict business-scope mu kalacak?
3. POS tek workspace + Focus Mode mu, yoksa tabli alt sayfa mi?
4. Support Mode (view-as + PII masking + impersonation audit) P1 mi P0 mi?
5. Bulk Action Mode'da ilk sprintte hangi 2 aksiyon olsun?
6. Export governance tarafinda async export ve email-link zorunlu mu?


---

## Source: SELLER-POS-MULTITAB-PLAN.md

# Seller POS + Multi Panel Plan (Taslak)

Tarih: 24 Subat 2026
Durum: MVP-1 tamamlandi, dogrulandi

## 0) Hedef

- POS ekranini tab bazli yonetmek: `Satis`, `Siparis`, `Stok`, `Finans`, `Musteriler`.
- Bu 5 tabi tam olarak sadece `SELLER` gorur.
- `USER` (seller alti personel) sadece `Satis` ve `Siparis` gorur.
- `CUSTOMER` sadece musteri alanlarina erisir; POS/Admin/Seller panellerine erisemez.
- Seller:
- stok yukler,
- urunu satisa ac/kapat yapar,
- e-ticarette magazasi altinda yayinlar,
- POS ve e-ticaret siparislerini tek ekranda yonetir,
- veresiye satis ile alacak-borc takibi yapar.

## 1) Rol Modeli (Hedef)

Not: Sistemde su an teknik enum `STAFF` var. Hedef yapida `USER` kullanilacak.

| Rol | Panel Yetkisi | POS Tab Yetkisi | Not |
|---|---|---|---|
| SUPER_ADMIN | Tum sistem | Tum tablar | En ust yetki |
| ADMIN | Isletme yonetimi + seller denetimi | Tum tablar | Varsayilan read-only, controlled override + audit |
| SELLER | Kendi magazasi | Satis, Siparis, Stok, Finans, Musteriler | Magaza sahibi |
| USER | Sadece sellerin verdigi yetki | Satis, Siparis | Varsayilan kisitli personel |
| CUSTOMER | Musteri alani | Yok | Satis yapan panel yok |

Karar: DB seviyesinde yeni `USER` enumu acilacak. `STAFF` teknik borc olusturmamasi icin migration ile kaldirilacak.
Gecis: `STAFF` kayitlari migration ile `USER`'a tasinacak, guard/policy katmani dogrudan `USER` ile calisacak.

## 2) Tab Bazli Yetki Matrisi

| Tab | SUPER_ADMIN | ADMIN | SELLER | USER | CUSTOMER |
|---|---|---|---|---|---|
| Satis | Evet | Evet | Evet | Evet | Hayir |
| Siparis | Evet | Evet | Evet | Evet | Hayir |
| Stok | Evet | Evet | Evet | Hayir | Hayir |
| Finans | Evet | Evet | Evet | Hayir | Hayir |
| Musteriler | Evet | Evet | Evet | Hayir | Hayir |

## 3) Ana Is Akislari

### 3.1 Seller personel daveti

1. Seller, customer kayitli kullaniciya davet gonderir.
2. Davet kabul edilince kullanici rolu `USER` olur.
3. Kullanici seller scope icinde `Satis` ve `Siparis` tablarina erisir.

### 3.2 Urun/stok/yayin akisi

1. Seller urunu stok ekranindan olusturur.
2. Urun kaydi stokta pasif veya taslak olur.
3. Seller "Satisa Cikar" isaretler.
4. Sistem fiziki "Magaza / X" category node olusturmaz.
5. Scope ile filtrelenmis kategori/urun agaci sellerId bazli uretilir (hidden scope).
6. E-ticaret tarafinda urun `/magaza/{sellerSlug}` uzerinden seller vitrininde gorunur.

### 3.3 POS satis + veresiye

1. Satis nakit/kart/veresiye secenekleri ile tamamlanir.
2. Veresiye ise musteri secimi zorunlu olur.
3. Soft limit politikasi uygulanir (`NONE`, `WARN`, `BLOCK`).
4. MVP-1: sadece `WARN` aktif edilir, limit asiminda uyari verilir ama satis devam eder.
5. Musteri ledger kaydi olusur (borc/alacak hareketi).
6. Tahsilat oldugunda ledger kapanis/azalis yapar.

### 3.4 Siparis birlesik gorunum

- POS siparisleri + web siparisleri seller siparis ekranina duser.
- Filtreler: kanal, tarih, durum, personel, musteri.

### 3.5 Finans gorunumu

- "Hangi user ne satti?" raporu.
- "Neler satildi?" urun bazli rapor.
- Gunluk kar, ciro, tahsilat, veresiye acik bakiye.

## 4) Backend Plan

### 4.1 Veri modeli degisiklikleri

1. `User.role`:
- Karar: `USER` yeni enum olarak acilacak.
- Gecis: mevcut `STAFF` kayitlari migration ile `USER`'a donusturulecek.

2. Seller-personel bagi:
- Yeni tablo: `SellerTeamMember`
- Alanlar: `sellerId`, `userId`, `isActive`, `permissionsJson`, `invitedByUserId`, `createdAt`.
- `permissionsJson` v1 (MVP) yapisi:
- `{"permissions":["tab.sales","tab.orders","pos.sale.create","orders.read","orders.updateStatus"]}`
- Yaklasim: feature-flag degil, acik izin anahtari listesi (string permission keys).
- Varsayilan:
- SELLER alti USER icin template: sadece satis+siparis izinleri.

3. Davet akis:
- Yeni tablo: `SellerInvite`
- Alanlar: `sellerId`, `targetUserId`, `status(PENDING/ACCEPTED/DECLINED/EXPIRED)`, `token`, `expiresAt`.

4. Urun sahipligi ve yayin:
- `Product.ownerSellerId` (nullable, seller urunu ise dolu).
- `Product.costPriceCents` (kar hesap icin zorunlu olmali).
- `Product.isPublished` (e-ticaret yayini ac/kapa).
- `Product.publishedAt`.
- Is kurali (MVP):
- `stockQty <= 0` iken urun publish edilemez.
- Publish urun stok 0'a dustugunde sistem otomatik `isPublished=false` yapar.

5. Magaza kategori bagi:
- `Category.sellerId` (nullable).
- `Category.scopeType` enum: `GLOBAL` | `SELLER_STORE`.
- `Category.parentId` mevcut agac yapisi korunur.
- Seller urunleri seller scope ile filtrelenir; fiziki "Magaza / X" node acilmaz.
- Frontend route: `/magaza/{sellerSlug}`.
- Uygulama modeli:
- MVP-1: sync (transaction icinde scope eslesme guncellemesi).
- MVP-2+: outbox/event-driven (performans icin).

6. Siparis ve finans izi:
- `Order.sellerId` (siparisi hangi seller magazasi kazandi).
- `OrderItem.costSnapshotCents` (satis anindaki maliyet snapshot).
- `Payment.createdByUserId` (hangi user tahsil etti).

7. Veresiye ledger:
- Yeni tablo: `CustomerLedgerEntry`
- Alanlar: `sellerId`, `customerId`, `orderId`, `type(DEBIT/CREDIT)`, `sourceType`, `amountCents`, `balanceAfterCents`, `createdByUserId`, `createdAt`.
- `sourceType` ornekleri: `SALE_DEBIT`, `PAYMENT_CREDIT`, `RETURN_REVERSAL`, `CANCEL_REVERSAL`, `MANUAL_ADJUSTMENT`.
- Is kurali (MVP):
- Iade/iptal oldugunda ilgili satis debit hareketine karsi credit reversal olusur.
- Ledger hareketleri immutable olur; guncelleme yerine ters kayit atilir.

8. Customer soft limit:
- `Customer.creditLimitCents` (nullable)
- `Customer.creditBlockPolicy` enum: `NONE` | `WARN` | `BLOCK`
- MVP-1 policy:
- Varsayilan `WARN`.
- `BLOCK` enumu simdiden tanimli olur ama aktif kullanim MVP+.

9. Outbox tablosu (simdiden ekle, sonra aktive et):
- Yeni tablo: `OutboxEvent`
- Alanlar: `aggregateType`, `aggregateId`, `eventType`, `payloadJson`, `processedAt`, `createdAt`.
- Kullanimi:
- MVP-1: sadece tablo var, producer/consumer zorunlu degil.
- MVP-2: outbox producer + poller/worker.
- MVP-3: full async event bus.

10. Performans indexleri:
- `Order(businessId, sellerId, createdAt)`
- `Payment(businessId, sellerId, createdAt)`
- `CustomerLedgerEntry(businessId, sellerId, customerId, createdAt)`

### 4.2 API katmani

1. Seller Team:
- `POST /seller/team/invites`
- `POST /seller/team/invites/:id/accept`
- `GET /seller/team/members`
- `PATCH /seller/team/members/:id`

2. Stock/Product:
- `POST /seller/products` (taslak stok urunu)
- `PATCH /seller/products/:id/publish`
- `PATCH /seller/products/:id/stock`
- `PATCH /seller/products/:id`
- Kural:
- publish endpointi stock <= 0 ise 422 doner.
- stock update sonrasi stock 0 ise auto-unpublish tetiklenir.

3. POS:
- Mevcut satis akisi korunur.
- Veresiye satis endpointinde musteri zorunlulugu eklenir.
- Veresiye satis oncesi `creditLimitCents/creditBlockPolicy` kontrolu calisir.
- Tahsilat endpointi ledger ile birlikte islenir.
- Iade/iptal akislarinda ledger reversal zorunlu islenir.

4. Orders:
- Seller scope order list: POS + WEB birlesik.
- USER rolu seller scope disina cikamaz.

5. Finance:
- User bazli satis raporu.
- Urun bazli kar raporu.
- Gunluk kar endpointi.
- Soft limit asim metrikleri (`warnCount`) dashboarda eklenir.

### 4.3 Yetki/guard kurallari

- `CUSTOMER`: sadece account/customer portal endpointleri.
- `USER`: seller team membership zorunlu + sadece izinli endpoint.
- `SELLER`: kendi sellerId scope.
- `ADMIN`: varsayilan read-only capraz seller gorunumu.
- `ADMIN` controlled override:
- kritik aksiyonlarda (`publish-force`, `stock-adjust-force`, `role-change`) zorunlu audit log.
- `SUPER_ADMIN`: tam yetki.

## 5) Frontend + UI Plan

### 5.1 Seller panel ana iskelet

- Ana route: mevcut `dashboard` icinde tab layout.
- Tablar:
- `Satis`
- `Siparis`
- `Stok`
- `Finans`
- `Musteriler`

### 5.2 Role gore tab gosterimi

- SELLER: 5 tabin tamami.
- USER: sadece `Satis`, `Siparis`.
- CUSTOMER: bu panele route guard ile hic giremez.

### 5.3 Tab icerikleri

1. Satis (POS):
- scanner-first akisi (zaten mevcut yon degisimi var),
- nakit/kart/veresiye,
- musteri sec veya ekle,
- fis/fatura.

2. Siparis:
- POS + WEB siparis listesi,
- kanal filtreleri,
- durum guncelleme.

3. Stok:
- urun olusturma/guncelleme,
- maliyet, satis fiyati, stok miktari,
- "satisa cikar" toggle.

4. Finans:
- KPI kartlari: ciro, net kar, tahsilat, veresiye bakiye.
- user bazli performans.
- urun bazli satis/kar.

5. Musteriler:
- seller musteri listesi,
- veresiye hareketleri,
- tahsilat/islem gecmisi.

## 6) Urun Yukleme Icinde Zorunlu Alanlar (Kar ve Rapor icin)

Zorunlu:
- urunAdi
- sku veya barcode
- kategori
- satisFiyatiCents
- costPriceCents
- stockQty
- taxRateBps
- unitType (adet, kg vb)
- isPublished (evet/hayir)

Opsiyonel:
- aciklama
- gorseller
- varyantlar
- minStockAlert

Kar hesap formulu (ilk surum):
- `netKar = (orderItem.unitPriceSnapshot - orderItem.costSnapshot) * quantity`
- Not: kargo/komisyon/iade maliyeti dagitimi MVP disi (ileri faz).

## 7) Rollout Fazlari

Faz 1: Rol ve yetki
- USER enum migration karari uygulanir
- guard/policy duzenlemesi

Faz 2: Veri modeli + migration
- seller ownership, publish, ledger, invite tablolari
- customer soft limit alanlari
- outbox tablosunun eklenmesi (pasif)

Faz 3: Backend endpointleri
- seller team, stock publish, finance rapor

Faz 4: Frontend tab UI
- role-based tablar
- stok/finans/musteriler ekrani

Faz 5: Entegrasyon
- e-ticaret siparis -> seller siparis yansima
- publish edilen urun -> magaza kategori gorunumu (MVP sync, sonra event-driven)

Faz 6: UAT ve canliya alim
- seller senaryolari
- user kisit testleri
- customer izolasyon testleri

## 8) Final Karar Seti (Kilitli)

1. `ADMIN` modeli: varsayilan sadece izleme + controlled override + zorunlu audit.
2. Kategori modeli: hidden seller scope, fiziki "Magaza / X" node yok.
3. Veresiye modeli: soft limit (`NONE`, `WARN`, `BLOCK`), MVP-1'de aktif davranis `WARN`.
4. Event modeli:
- MVP-1: transaction ici sync
- MVP-2: outbox pattern
- MVP-3: full async event bus

## 9) MVP Siniri (Oneri)

MVP-1 icin zorunlu:
- role/tab yetkileri,
- seller stock + publish,
- pos/web siparis birlesik liste,
- veresiye ledger temel akisi,
- soft limit WARN davranisi,
- outbox tablosunun schema olarak ekli olmasi (pasif),
- finans dashboard (gunluk ciro/kar + user satis).

MVP sonrasi:
- gelismis davet akisi (mail/sms),
- gelismis analitik,
- detayli komisyon/maliyet dagitimi.

## 10) Uygulama Durumu (24 Subat 2026)

- Tamamlandi:
- USER enum gecisi + STAFF -> USER migration
- Seller Team + Invite akislari (create/accept/list/update)
- Seller urun sahipligi/publish/stock endpointleri
- Publish kurali (`stock <= 0` yayin engeli) + stock 0 durumunda auto-unpublish
- POS + WEB siparislerinin seller scope listelenmesi
- Veresiye satis + soft limit WARN davranisi
- Customer ledger debit/credit/reversal akislari
- Payment/return/cancel akislarinda ledger kapanislari
- Seller finance KPI + user bazli + urun bazli raporlar
- warnCount metri gi ve dashboard entegrasyonu
- OutboxEvent tablo seviyesi (pasif) eklendi
- Frontend role-tab ayrimi:
- SELLER: Satis/Siparis/Stok/Finans/Musteriler
- USER: Satis/Siparis
- CUSTOMER izolasyonu
- Siparis ekraninda kanal/tarih/durum/personel/musteri filtreleri
- USER icin finance/customers API erisimi kapatildi
- USER seller-team permission key enforcement (orders/pos kritik akislar)
- POS siparis aksiyonlarinda USER permission gate: invoice(`orders.read`), split/apply-balance(`pos.sale.create`), return(`orders.updateStatus`)
- POS genel endpointlerinde USER icin seller-team + `tab.sales` zorunlulugu eklendi (session/product/customer akislarinda da enforced)
- Public seller vitrin route uyumu: `/magaza/{sellerSlug}` canonical + link + pagination + alias
- Rol izolasyon smoke suiti: `SELLER/USER/CUSTOMER/ADMIN/SUPER_ADMIN` endpoint matrix e2e
- Orders listesinde USER icin seller-team uyeligi zorunlulugu sertlestirildi
- AuditLog modeli + migration eklendi (`actorRole`, `actorUserId`, `actionType`, `targetType`, `targetId`, `payloadJson`, `createdAt`)
- Kritik aksiyon seti kilitlendi: `publish-force`, `stock-adjust-force`, `role-change`
- ADMIN icin kritik write aksiyonlari normal endpointte read-only yapildi (`products.update[stock/publish]`, `users.role`)
- Kontrollu override endpointleri eklendi (zorunlu `reason` + audit):
- `PATCH /platform/sellers/:sellerId/products/:id/publish-force`
- `PATCH /platform/sellers/:sellerId/products/:id/stock-force`
- `PATCH /users/:id/role/override`
- SUPER_ADMIN kritik write aksiyonlarinda tam yetkili, audit kaydi zorunlu hale getirildi
- B6 e2e kapsami eklendi: admin normalde 403, override ile 2xx + audit kaydi
- Seller invite delivery domain modeli eklendi (`SellerInviteDelivery`, kanal/status/retry/dead-letter alanlari)
- Invite delivery adapter katmani eklendi (env-driven `EMAIL`/`SMS` secimi)
- Invite create aninda async delivery tetikleme eklendi (job/timer tabanli kuyruk)
- Retry + dead-letter davranisi eklendi (`RETRY` -> `DEAD_LETTER`, `attemptCount/maxAttempts`)
- Seller/Admin invite gorunumune delivery durumu eklendi (`GET /seller/team/invites`)
- Seller invite delivery e2e suiti eklendi (basarili teslimat + hata/retry/dead-letter)
- Finans hesap motoru allocation-aware genisletildi (shipping/commission/return maliyet dagitimi)
- Snapshot alanlari eklendi (`Order.shippingCostCents`, `Order.commissionSnapshotCents`, `Order.returnCostCents`, `OrderItem.*AllocationCents`, `OrderItem.netProfitV2Cents`)
- Finance endpointleri net profit v2 ve allocation maliyet metrikleri ile genislendi
- Dashboard finans kartlari/tablolari net profit v2 metriklerini gosterecek sekilde guncellendi
- Allocation-aware finans e2e fixture suiti eklendi
- Outbox aktivasyonu tamamlandi: producer akislari (`order.created`, `payment.created`, `product.publish.changed`, `seller.invite.created`)
- Outbox worker/poller aktif edildi (batch processing + retry schedule)
- Idempotency + poison/dead-letter stratejisi eklendi (`idempotencyKey`, `attemptCount`, `nextRetryAt`, `deadLetteredAt`)
- Outbox monitoring endpointleri eklendi (`/platform/outbox/metrics`, `/platform/outbox/events`)
- Outbox aktivasyon e2e suiti eklendi (idempotent event, force-fail dead-letter)
- UAT senaryo listesi + staging validation + release/rollback dokumani hazirlandi (`SELLER-POS-UAT-RELEASE-CHECKLIST.md`)
- Son toplu regresyon tekrar kosuldu (`backend build`, `backend e2e`, `frontend build`) ve tumu yesil

- Dogrulama:
- Backend e2e: `14/14` suite, `101/101` test gecti
- Backend build: gecti
- Frontend build: gecti

- Kalan acik madde:
- Yok (plan backlog A-F tamamen kapatildi)

## 11) Arkali Gorev Listesi (Autopilot Queue)

Bu liste, her fazda "devam et" komutu beklemeden sira ile uygulanacak backlog kuyru gudur.
Kural: Siradaki acik gorev bitmeden sonraki goreve gecilmez.

### A. Stabilizasyon ve Plan Uyum Kapatma


Tamamlanma kriteri:
- Frontend build gecer
- Backend build gecer
- E2E ana paket gecer

### B. Admin Controlled Override + Audit (Kilit Karar 1)


Tamamlanma kriteri:
- Kritik endpointlerde ADMIN davranisi planla birebir uyumlu olur
- Audit kaydi olmayan kritik aksiyon kalmaz
- E2E green

### C. Seller Invite Delivery Orkestrasyonu (MVP Sonrasi 1)


Tamamlanma kriteri:
- Invite delivery sureci gozlemlenebilir ve retry edilebilir olur

### D. Gelismis Analitik + Komisyon/Maliyet Dagitimi (MVP Sonrasi 2)


Tamamlanma kriteri:
- Raporlar allocation-aware net kar uretebilir
- Eski raporlarla geriye donuk kirilim olmadan calisir

### E. Outbox Aktivasyonu (MVP-2 Hazirlik)


Tamamlanma kriteri:
- Outbox tablosu pasif durumdan aktif event pipeline durumuna gecer

### F. UAT ve Canliya Alim


Tamamlanma kriteri:
- Tum backlog maddeleri kapanir
- Son test/build seti yesil olur
- Kalan acik madde sadece bilerek ertelenen teknik borclar olur

## 12) Calisma Protokolu (Bundan Sonra)

- Sira: A -> B -> C -> D -> E -> F
- Her gorev sonunda ilgili testler kosulur, faz sonlarinda tam regresyon kosulur
- Bloke olmayan hicbir noktada kullanicidan "devam" beklenmez
- Sadece urun/karar belirsizligi olursa tek net soru sorulur


---

## Source: SELLER-POS-UAT-RELEASE-CHECKLIST.md

# Seller POS MultiTab - UAT, Staging Validation, Release Checklist

Tarih: 24 Subat 2026
Kapsam: Seller POS + role isolation + finance allocation + outbox activation

## 1) UAT Senaryo Listesi (F1)

### UAT-01 - Rol tab izolasyonu
- Kullanici: SELLER
- Beklenen: `Satis`, `Siparis`, `Stok`, `Finans`, `Musteriler` tablarinin tumu gorunur.

### UAT-02 - USER kisitli panel
- Kullanici: USER (aktif seller-team membership)
- Beklenen: Sadece `Satis` ve `Siparis` tablari gorunur; finance/customers API 403.

### UAT-03 - CUSTOMER izolasyonu
- Kullanici: CUSTOMER
- Beklenen: Seller/POS endpointlerine erisim 403.

### UAT-04 - ADMIN controlled override
- Kullanici: ADMIN
- Beklenen: Kritik aksiyonlar normal endpointte 403; override endpoint + reason ile 2xx; audit yazilir.

### UAT-05 - SUPER_ADMIN kritik write
- Kullanici: SUPER_ADMIN
- Beklenen: Kritik aksiyonlar 2xx; audit kaydi olusur.

### UAT-06 - Seller invite delivery (success)
- Kullanici: SELLER
- Beklenen: Invite olusunca delivery row olusur, durum `SENT` olur.

### UAT-07 - Seller invite delivery (failure/retry/dead-letter)
- Kullanici: SELLER
- Beklenen: Hata senaryosunda retry denenir, max attempt sonra `DEAD_LETTER`.

### UAT-08 - Finance allocation-aware metrikler
- Kullanici: SELLER
- Beklenen: `netProfitV2Cents` ve allocation maliyet metrikleri overview ve raporlarda dogru hesaplanir.

### UAT-09 - Outbox pipeline
- Kullanici: SELLER/ADMIN
- Beklenen: `order/payment/publish/invite` eventleri outbox'a duser ve worker tarafindan islenir.

### UAT-10 - Outbox idempotency ve dead-letter
- Kullanici: ADMIN
- Beklenen: Ayni idempotency key duplicate event uretmez; poison event dead-letter'a duser.

## 2) Staging Validation Report (F2)

Not: Bu rapor kod tabani icindeki otomatik test/build kanitlari ile olusturulmustur.
Ayrica staging ortaminda manuel UAT adimlari ayni senaryolarla tekrar edilmelidir.

### Teknik dogrulama

### Fonksiyonel kapsam ozeti

## 3) Release Checklist ve Rollback Plani (F3)

### Release checklist

### Operasyonel notlar (env)
- `OUTBOX_WORKER_ENABLED`
- `OUTBOX_POLL_INTERVAL_MS`
- `OUTBOX_BATCH_SIZE`
- `OUTBOX_MAX_ATTEMPTS`
- `OUTBOX_RETRY_DELAY_MS`
- `SELLER_INVITE_DELIVERY_CHANNELS`
- `SELLER_INVITE_DELIVERY_MAX_ATTEMPTS`
- `SELLER_INVITE_RETRY_DELAY_MS`

### Rollback plani
1. Yeni migration'larin uygulandigi deployment rollback edilirse, once uygulama eski surume alinmaz; migration geri alma adimi planli calistirilir.
2. Acil durumda outbox worker kapatilir: `OUTBOX_WORKER_ENABLED=false`.
3. Invite delivery gecici devre disi:
- `SELLER_INVITE_DELIVERY_CHANNELS=` (bos) veya `SELLER_INVITE_SMS_ENABLED=false` ve `SELLER_INVITE_EMAIL_ENABLED=false`.
4. Kritik endpoint bozulmasinda sadece read-path acik tutulur, write-path feature freeze uygulanir.
5. Incident sonrasi dead-letter outbox eventleri manuel replay proseduru ile tekrar kuyruklanir.

## 4) Kanitlar
- `backend/test/role-isolation-smoke.e2e-spec.ts`
- `backend/test/seller-invite-delivery.e2e-spec.ts`
- `backend/test/finance-allocation.e2e-spec.ts`
- `backend/test/outbox-activation.e2e-spec.ts`


---

## Source: CODE-ANALYSIS-REPORT.md

# Nutopiano Kod Analiz Raporu
**Tarih:** 17 Şubat 2026  
**Durum:** Detaylı Analiz Tamamlandı

---

## 📊 Genel Özet

**Backend:** NestJS + Prisma (PostgreSQL)  
**Frontend:** Next.js 16 + TypeScript + Tailwind CSS v4  
**Mimari:** Multi-tenant SaaS modeli

---


### Backend (NestJS)

#### 1. **Kimlik Doğrulama & Yetkilendirme**

**Dosyalar:**
- [backend/src/auth/auth.service.ts](backend/src/auth/auth.service.ts) - 305 satır
- [backend/src/auth/auth.controller.ts](backend/src/auth/auth.controller.ts)
- [backend/src/core/guards/jwt-auth.guard.ts](backend/src/core/guards/jwt-auth.guard.ts)
- [backend/src/core/guards/roles.guard.ts](backend/src/core/guards/roles.guard.ts)

#### 2. **Müşteri Yönetimi (CRM)**
  - Yeni endpoint: `GET /api/customers/me` - Mevcut kullanıcının müşteri kaydını döner
  - Otomatik müşteri oluşturma (Checkout akışında kullanılır)
  - Unique constraint: bir kullanıcı = bir müşteri kaydı

**Dosyalar:**
- [backend/src/modules/customers/customers.service.ts](backend/src/modules/customers/customers.service.ts)
- [backend/src/modules/customers/customers.controller.ts](backend/src/modules/customers/customers.controller.ts)

#### 3. **Ürün Yönetimi**

**Dosyalar:**
- [backend/src/modules/products/products.service.ts](backend/src/modules/products/products.service.ts) - 375 satır

#### 4. **Sipariş Yönetimi**

**Dosyalar:**
- [backend/src/modules/orders/orders.service.ts](backend/src/modules/orders/orders.service.ts) - 457 satır

#### 5. **Randevu Yönetimi**

**Dosyalar:**
- [backend/src/modules/appointments/appointments.controller.ts](backend/src/modules/appointments/appointments.controller.ts)

#### 6. **Kategoriler**

#### 7. **İçeriği Yönetimi**

#### 8. **Dosya Yükleme**

**Dosyalar:**
- [backend/src/modules/uploads/uploads.controller.ts](backend/src/modules/uploads/uploads.controller.ts)

#### 9. **Email Servisi**

**Dosyalar:**
- [backend/src/email/email.service.ts](backend/src/email/email.service.ts)

#### 10. **Veritabanı & ORM**

**Dosya:**
- [backend/prisma/schema.prisma](backend/prisma/schema.prisma) - 279 satır

---

### Frontend (Next.js)

#### 1. **Sayfa Yapısı**

#### 2. **Durum Yönetimi**

**Dosyalar:**
- [frontend/src/store/userSlice.ts](frontend/src/store/userSlice.ts)
- [frontend/src/store/cartSlice.ts](frontend/src/store/cartSlice.ts)

#### 3. **API İstemcisi**

**Dosyalar:**
- [frontend/src/services/api.ts](frontend/src/services/api.ts)

#### 4. **Bileşenler (Components)**

**Dosyalar:**
- [frontend/src/components/Header.tsx](frontend/src/components/Header.tsx)
- [frontend/src/components/Footer.tsx](frontend/src/components/Footer.tsx)
- [frontend/src/components/ProductCard.tsx](frontend/src/components/ProductCard.tsx)

#### 5. **Tasarım Sistemi**

**Dosyalar:**
- [frontend/src/app/globals.css](frontend/src/app/globals.css)

#### 6. **Formlar & Validasyon**

#### 7. **Bildirimler**

---

## ⚠️ Eksik/Tamamlanmayan Özellikler

### Kritik (YAPILMASI GEREKEN)

#### 1. **Frontend Checkout Akışı - EKSIK**
**Durum:** Backend `GET /api/customers/me` ready, Frontend henüz integrate etmemiş

**Gerekli işler:**
- [ ] Checkout sayfasında `GET /api/customers/me` çağrı, customer kaydı oluştur/al
- [ ] Customer ID'yi Redux state'e kaydet
- [ ] Order oluştururken `customerId` kullan
- [ ] Error handling (müşteri oluşturulamadı, vb.)
- [ ] Loading state göster

**Dosya:** [frontend/src/app/checkout/page.tsx](frontend/src/app/checkout/page.tsx) (445 satır, eksik entegrasyon)

#### 2. **Sipariş Geçmişi Ekranı - EKSIK**
**Durum:** Backend `/orders` uç noktası var, Frontend görünümü yok

**Gerekli işler:**
- [ ] Kullanıcının siparişlerini listele
- [ ] Sipariş detaylarını göster (maddeler, toplam, durum)
- [ ] Sipariş durumu timeline'ı
- [ ] Tarih bazlı filtreleme

**Dosya:** [frontend/src/app/account/orders/page.tsx](frontend/src/app/account/orders/page.tsx) (eksik)

#### 3. **Profil Sayfası - EKSIK**
**Durum:** Login/Register var, profil düzenleme eksik

**Gerekli işler:**
- [ ] `PATCH /auth/profile` entegrasyonu
- [ ] Ad, telefon, email güncelleme
- [ ] Şifre değiştirme formu
- [ ] Başarı/hata mesajları

**Dosya:** [frontend/src/app/account/profile/page.tsx](frontend/src/app/account/profile/page.tsx) (eksik)

---

### Yüksek Öncelik (ÖNEMLI)

#### 4. **Ürün & Sipariş Sepeti Olay Yönetimi**
- [ ] Sepet güncelleme (quantity artırma/azaltma)
- [ ] Sepeti boşalt
- [ ] Sepet tutarlılığı (simdiki fiyatlar ile karşılaştır)
- [ ] Sepet sabitliliği (localStorage sync)

#### 5. **Stok Yönetimi**
- [ ] Stok kontrolü sırasında sipariş
- [ ] Out of stock ürünleri devre dışı bırak
- [ ] Düşük stok uyarısı

**Başlangıç:** Şema hazır, StrateJi implement edilmemiş

#### 6. **Ödeme Entegrasyonu**
- [ ] Gerçek ödeme geçidi (Stripe, PayPal, vb.)
- [ ] Ödeme durumu izleme
- [ ] Ödeme başarısız handling

**Durum:** DB schema var, entegrasyon yok

#### 7. **Form Validasyon - Kısmi Tamamlanmış**
- [ ] Checkout form validasyonu (tüm alanlar)
- [ ] Address validasyonu (şer tutubuy alanı)
- [ ] Telefon formatlama

#### 8. **Mobile Responsive - Kısmi**
- [ ] Admin paneli mobilde test edilmemiş
- [ ] Checkout mobilde test edilmemiş
- [ ] Tablet optimizasyonu

---

### Orta Öncelik (İSTEĞE BAĞLI)

#### 9. **Admin Dashboard - Eksik**
**Durum:** Sayfa şablonları var, fonksiyonalite eksik

Eksik endpoinler:
- [ ] Ürün yönetimi dashboard
- [ ] Müşteri analitiği
- [ ] Sipariş raporları
- [ ] Personel yönetimi
- [ ] Satış grafiği

#### 10. **İletişim & Bildirimler**
- [ ] SMS bildirimler (randevu, sipariş)
- [ ] Email bildirimler (sipariş onayı, tracking)
- [ ] Push notifications
- [ ] In-app notifications

**Durum:** Email service başlangıç seviye, SMS yok

#### 11. **Arama & Filtreleme - Temel**
- [ ] Kategori filtreleme
- [ ] Fiyat aralığı filtreleme
- [ ] Sıralama (fiyat, tarih, popülarite)
- [ ] Pagination

#### 12. **Resim Yönetimi - Temel**
- [ ] Resim optimizasyonu (WebP, CDN)
- [ ] Resim galeri (carousel)
- [ ] Thumbnail oluşturma

#### 13. **Üründe Yorum & Puanlama - EKSIK**
- [ ] Ürün yorumları
- [ ] Yıldız puanlaması
- [ ] Yorum moderasyonu
- [ ] Yararlı oy sistemi

#### 14. **İstek Listem (Wishlist) - EKSIK**
- [ ] Ürün isteği listesi
- [ ] Paylaşılabilir wishlist
- [ ] Fiyat değişiklikleri alertleri

#### 15. **Ürün Karşılaştırması - EKSIK**
- [ ] Çoklu ürün karşılaştırma
- [ ] Spec tablosu
- [ ] Farklılıkları vurgula

---

### Düşük Öncelik (İYİ YAPILMASI)

#### 16. **Kurumsal Ürünler - Temel**
- [ ] Sub-account yönetimi
- [ ] Bölüm bazlı erişim kontrolleri
- [ ] Kullanıcı rol hierarchisi

#### 17. **İçeriği (CMS)**
- [ ] Blog/Makale sayfaları
- [ ] FAQ sistemi
- [ ] Sayfalar (Hakkında, Şartlar, Gizlilik)
- [ ] HSV İçeriği

#### 18. **Analitikler & Raporlar**
- [ ] Satış raporları
- [ ] Müşteri raporları
- [ ] Envanter raporları
- [ ] Google Analytics entegrasyonu

#### 19. **SEO Optimizasyonu**
- [ ] Stiemap oluşturma
- [ ] Robots.txt
- [ ] Meta tag management
- [ ] Structured data (JSON-LD)

#### 20. **Sosyal Medya**
- [ ] Sosyal giriş (Google, Facebook)
- [ ] Sosyal paylaşım düğmeleri
- [ ] Sosyal kanallarda giriş

#### 21. **Lokalizasyon (i18n)**
- [ ] Çok dil desteği
- [ ] Döviz desteği
- [ ] Tarih/saat formatı

---

## 🐛 Bilinen Sorunlar & Uyarılar

### CSS Linter Uyarısı (Önemsiz)
```
Unknown at rule @theme in globals.css line 115
```
**Nedeni:** Tailwind CSS v4 yeni özelliği  
**Çözüm:** False positive, işlem gerekmez

### Tamamlanmayacak Hatalar

---

## 📋 Mimarı & Kod Kalitesi

### Backend (NestJS)
**Doğru uygulamalar:**

**Geliştirme Alanları:**
- [ ] Comprehensive error logging
- [ ] Request logging/tracing
- [ ] Rate limiting
- [ ] Input sanitization (SQL injection protection)
- [ ] CORS configuration
- [ ] API versioning
- [ ] Swagger documentation completion

### Frontend (Next.js)
**Doğru uygulamalar:**

**Geliştirme Alanları:**
- [ ] Comprehensive error handling
- [ ] Loading skeletons
- [ ] Empty states
- [ ] Error fallback pages
- [ ] Performance optimization (Code splitting)
- [ ] Image optimization
- [ ] SEO improvement (metadata)
- [ ] Accessibility audit (a11y)

---

## 🧪 Test Durumu

### E2E Testler
Oluşturulan e2e test dosyaları:
- [backend/test/app.e2e-spec.ts](backend/test/app.e2e-spec.ts)
- [backend/test/auth-users.e2e-spec.ts](backend/test/auth-users.e2e-spec.ts)
- [backend/test/customers.e2e-spec.ts](backend/test/customers.e2e-spec.ts)
- [backend/test/order-status.e2e-spec.ts](backend/test/order-status.e2e-spec.ts)
- [backend/test/orders-payments.e2e-spec.ts](backend/test/orders-payments.e2e-spec.ts) - 340 satır
- [backend/test/products.e2e-spec.ts](backend/test/products.e2e-spec.ts)
- [backend/test/appointments.e2e-spec.ts](backend/test/appointments.e2e-spec.ts)
- [backend/test/settings.e2e-spec.ts](backend/test/settings.e2e-spec.ts)


### Unit Testler
- Minimal coverage
- Eksik: Services, Guards, Strategies
- Eksik: Frontend component tests

### Frontend Testleri
- [ ] Component tests (Jest)
- [ ] Integration tests
- [ ] E2E tests (Cypress/Playwright)

---

## 📈 İstatistikler

| Kategori | Durum |
|----------|-------|
| **Backend Controllers** | 8/8 uygulanmış |
| **Backend Services** | 8/8 uygulanmış |
| **Frontend Pages** | 12/15 uygulanmış |
| **Frontend Components** | 6/15 uygulanmış |
| **Database Models** | 11/11 uygulanmış |
| **Migrations** | 12/12 uygulanmış |
| **Unit Tests** | ~20% |
| **E2E Tests** | ~15% |

---

## 🎯 İlk Adımlar (Yapılacaklar)

### 1. Hafta 1: Kritik Tamamlamalar
- [ ] Checkout akışı backend-frontend entegrasyonu
- [ ] Sipariş geçmişi sayfası
- [ ] Profil güncelleme sayfası
- [ ] Form validasyonları

### 2. Hafta 2: Işık Kontrolleri
- [ ] Stok yönetimi
- [ ] Mobile responsive testing
- [ ] API error handling iyileştirmesi
- [ ] Loading states ve skeletons

### 3. Hafta 3: Yeni Özellikler
- [ ] Ödeme entegrasyonu
- [ ] Email bildirimler
- [ ] Admin dashboard işlevselliği
- [ ] Arama ve filtreleme

### 4. Hafta 4+: Gelişmeler
- [ ] Raporlar ve analitiği
- [ ] Sosyal medya entegrasyonu
- [ ] SEO optimizasyonu
- [ ] Performans tunuxu

---

## 📞 Sorular?

Detaylar hakkındaki **sorularınız** için:
1. Dosya linklerine tıklayın
2. Spesifik fonksiyonlar analiz etmek istiyorsanız, adını verin
3. Eksik özellikler hakkında daha fazla bilgi isterseniz, bize söyleyin

**Son Güncelleme:** 17 Şubat 2026


---

## Source: IMPLEMENTATION-SUMMARY.md

# Nutopiano UI Improvements - Implementation Summary

**Date:** 2026-02-11  
**Servers:** Both Backend (3001) and Frontend (3000) Running

---

## 🎯 Objectives Completed

8. ⏳ User-Customer linkage functionality (Next phase)

---

## 📊 Design Improvements Implemented

### 1. Enhanced Design System (`globals.css`)

#### Color System Improvements
**Before:**
- Limited color palette with hardcoded hex values
- Potential accessibility issues with some contrast ratios
- No semantic color variations

**After:**
- Complete color scale system (50-950 for each palette)
- Improved accessibility with WCAG AA compliant contrasts
- Semantic colors (error, success, warning, info)
- CSS variables for easy theming

```css
/* Primary Palette (10 shades) */
--primary-950 to --primary-100

/* Accent Palette - Rich Gold (9 shades) */
--accent-900 to --accent-100

/* Neutral Palette - Warm Grays (11 shades) */
--neutral-950 to --neutral-50

/* Semantic Colors */
--error, --success, --warning, --info (each with 3 shades)
```

#### Spacing System
**Before:** Arbitrary gap values (`gap-2`, `gap-5`, `gap-8`)

**After:** Systematic 8px-based spacing scale
```css
--spacing-xs: 8px
--spacing-sm: 12px
--spacing-md: 16px
--spacing-lg: 24px
--spacing-xl: 32px
--spacing-2xl: 48px
--spacing-3xl: 64px
--spacing-4xl: 96px
```

#### Border Radius Scale
**Before:** Inconsistent values (12px, 16px, 20px, 28px, 32px, 40px)

**After:** Standardized scale
```css
--radius-sm: 12px (buttons, inputs)
--radius-md: 16px (cards)
--radius-lg: 20px (medium cards)
--radius-xl: 24px (large sections)
--radius-2xl: 28px (hero sections)
--radius-3xl: 32px (extra large)
--radius-full: 9999px (pills, badges)
```

#### Elevation System (Shadows)
**Before:** Inconsistent custom shadows

**After:** Systematic shadow scale
```css
--shadow-xs: 0 1px 4px rgba(26, 60, 52, 0.04)
--shadow-sm: 0 2px 8px rgba(26, 60, 52, 0.06)
--shadow-md: 0 4px 16px rgba(26, 60, 52, 0.08)
--shadow-lg: 0 8px 24px rgba(26, 60, 52, 0.10)
--shadow-xl: 0 16px 40px rgba(26, 60, 52, 0.12)
--shadow-2xl: 0 24px 60px rgba(26, 60, 52, 0.15)
```

#### Transition System
Added consistent timing functions:
```css
--transition-fast: 150ms
--transition-base: 200ms
--transition-slow: 300ms
--transition-slower: 500ms
```

---

### 2. Header Component Enhancements

**Visual Improvements:**

**Interactive Improvements:**

**Accessibility:**

---

### 3. ProductCard Component Enhancements

**Visual Improvements:**

**New Features:**

**Interactive Improvements:**

---

### 4. Global CSS Enhancements

**Typography:**

**Utility Classes:**

**Scrollbar Styling:**

**Selection Styling:**

**Animations:**

---

## 🎨 Before/After Comparison

### Color Usage
| Before | After | Improvement |
|--------|-------|-------------|
| `text-[#AC9C7A]` | `text-[var(--neutral-500)]` | Better contrast, maintainable |
| `bg-[#1A3C34]` | `bg-[var(--primary-800)]` | Semantic naming |
| `border-[#E0D7C6]` | `border-[var(--neutral-200)]` | Systematic scale |

### Shadows
| Before | After |
|--------|-------|
| `shadow-[0_60px_150px_rgba(26,60,52,0.18)]` | `shadow-[var(--shadow-2xl)]` |
| `shadow-[0_20px_60px_rgba(26,60,52,0.08)]` | `shadow-[var(--shadow-xl)]` |
| `shadow-md` | `shadow-[var(--shadow-md)]` |

### Transitions
| Before | After |
|--------|-------|
| `duration-200` | `duration-[var(--transition-base)]` |
| `duration-150` | `duration-[var(--transition-fast)]` |
| No standard easing | `cubic-bezier(0.4, 0, 0.2, 1)` |

---

## 📝 Technical Implementation Details

### CSS Variables Strategy
We implemented a **progressive enhancement** approach:
1. Created new design system variables
2. Maintained legacy variables for backward compatibility
3. Components can gradually migrate to new system
4. No breaking changes to existing code

### Accessibility Improvements
1. **Color Contrast:** All text colors now meet WCAG AA standards
2. **Focus States:** Enhanced focus indicators with accent color
3. **Interactive Feedback:** Clear hover and active states
4. **Keyboard Navigation:** Maintained and improved throughout

### Performance Considerations
1. **Transitions:** Used GPU-accelerated properties (transform, opacity)
2. **Will-change:** Avoided overuse, only on critical animations
3. **Backdrop-filter:** Limited to header for premium feel
4. **Image Loading:** Maintained Next.js Image optimization

---

## 🎯 User Experience Improvements

1. **Visual Feedback:**
   - Every interactive element has hover states
   - Buttons scale on interaction
   - Cards lift on hover
   - Images zoom smoothly

2. **Information Hierarchy:**
   - Stock status immediately visible
   - Price more prominent (larger text)
   - Better spacing between elements

3. **Premium Feel:**
   - Glass morphism on header
   - Soft shadows throughout
   - Smooth, thoughtful transitions
   - Cohesive color palette

4. **Consistency:**
   - Uniform spacing scale
   - Predictable shadow elevations
   - Standardized border radius
   - Consistent transitions

---

## 🚀 Next Steps

### Phase 2: User-Customer Linkage Implementation
The next priority is to implement the user-customer linkage functionality for seamless checkout:

#### Required Changes:
1. **Backend:**
   - Review customer model and user relationship
   - Ensure checkout can link authenticated users to customer records
   - API endpoints for customer creation/linking

2. **Frontend:**
   - Checkout flow to create/link customer
   - User profile integration
   - Order history display

3. **Testing:**
   - End-to-end checkout flow
   - User authentication → Customer creation → Order placement
   - Edge cases (existing customer, guest checkout, etc.)

### Future UI Enhancements:
1. Add product image galleries
2. Implement skeleton loaders
3. Add empty state illustrations
4. Create custom toast notifications
5. Enhance form validation feedback
6. Add product quick view modal
7. Implement infinite scroll for products
8. Add wishlist functionality UI

---

## 📊 Metrics to Monitor

Once deployed, track these KPIs:

| Metric | Baseline | Target | Notes |
|--------|----------|--------|-------|
| Conversion Rate | TBD | +15% | Better visual hierarchy |
| Cart Abandonment | TBD | -10% | Improved cart UX |
| Time on Site | TBD | +20% | More engaging interactions |
| Mobile Bounce Rate | TBD | -15% | Better mobile experience |
| Page Load Time | TBD | <2s | Optimized assets |

---

## 🔧 Maintenance Notes

### Ongoing Tasks:
1. Monitor CSS bundle size
2. Test cross-browser compatibility
3. Validate accessibility with tools
4. Gather user feedback
5. A/B test design variations

### Known Issues:
- ⚠️ CSS lint warning for `@theme` directive (expected, Tailwind CSS v4 feature)

---


- [ ] Verify UI improvements on localhost:3000 (now running in dev mode)
- [ ] Document user-customer linkage requirements
- [ ] Plan checkout flow implementation
- [ ] Create database migration if needed
- [ ] Implement customer linking logic
- [ ] Update checkout UI components
- [ ] Test complete checkout flow
- [ ] Deploy to staging environment

---

## 🎓 Key Learnings

1. **Design Systems Matter:** A systematic approach to design tokens makes the entire codebase more maintainable
2. **Progressive Enhancement:** Maintaining backward compatibility while introducing improvements reduces risk
3. **Micro-interactions:** Small details like hover effects and transitions significantly impact perceived quality
4. **Accessibility First:** Building with accessibility in mind from the start is easier than retrofitting
5. **CSS Variables:** Modern CSS variables enable powerful theming and maintainability

---

**Status:** Ready for review and next phase implementation 🚀


---

## Source: UI-IMPROVEMENTS.md

# Nutopiano UI/UX Improvements Analysis

**Date:** 2026-02-11  
**Objective:** Analyze and propose improvements to the Nutopiano e-commerce website design

---

## Current Design Analysis

### Color Palette
```css
--primary: #1A3C34 (Dark green)
--accent: #C5A059 (Gold)
--background: #ffffff (White)
--surface: #F7F4EF (Warm off-white)
--muted: #5C5C5C (Gray)
--border: #E0D7C6 (Beige)
--secondary-text: #AC9C7A (Muted gold)
```

### Typography
- **Headings:** Playfair Display (Serif)
- **Body:** Source Sans 3 (Sans-serif)
- **Letter-spacing:** Generous tracking (0.2-0.3em) for uppercase text

---

## Identified Design Flaws

### 1. **Color Contrast & Accessibility**
- **Issue:** Some text colors (e.g., `#AC9C7A` on white) may not meet WCAG AA standards
- **Impact:** Reduced readability for users with visual impairments
- **Priority:** HIGH

### 2. **Inconsistent Spacing**
- **Issue:** Gap values vary inconsistently (`gap-2`, `gap-3`, `gap-4`, `gap-5`, `gap-8`, `gap-10`, `gap-12`)
- **Impact:** Visual hierarchy feels uneven
- **Priority:** MEDIUM

### 3. **Button Style Inconsistency**
- **Issue:** Multiple button styles across components (rounded-full, rounded-2xl, rounded-3xl)
- **Impact:** Lack of consistent interaction patterns
- **Priority:** MEDIUM

### 4. **Border Radius Overuse**
- **Issue:** Very large border-radius values (40px, 32px) on some sections
- **Impact:** Can feel overly rounded and reduce premium feel
- **Priority:** LOW

### 5. **Typography Hierarchy**
- **Issue:** Text sizes jump inconsistently (xs: 11px, sm: 14px, base: 16px, lg: 18px, xl: 20px, 2xl: 24px, 3xl: 30px, 4xl: 36px, 5xl: 48px)
- **Impact:** Inconsistent visual rhythm
- **Priority:** MEDIUM

### 6. **Shadow Depth**
- **Issue:** Inconsistent shadow usage (some very intense, some very subtle)
- **Impact:** Inconsistent depth perception
- **Priority:** LOW

### 7. **Interactive Feedback**
- **Issue:** Limited hover states and micro-interactions
- **Impact:** Less engaging user experience
- **Priority:** MEDIUM

### 8. **Mobile Responsiveness**
- **Issue:** Some sections might have cramped spacing on mobile
- **Impact:** Poorer mobile UX
- **Priority:** HIGH

---

## Proposed Solutions

### 1. Enhanced Color System
```css
/* Improved contrast ratios while maintaining brand */
:root {
  /* Primary palette - enhanced for accessibility */
  --primary-900: #0F2420;        /* Darker variant for better contrast */
  --primary-800: #1A3C34;        /* Current primary */
  --primary-700: #245244;        /* Lighter variant */
  --primary-600: #2E6854;        /* Even lighter */
  
  /* Accent palette - richer golds */
  --accent-700: #B8914D;         /* Richer gold */
  --accent-600: #C5A059;         /* Current accent */
  --accent-500: #D4B06F;         /* Lighter gold */
  --accent-400: #E3C085;         /* Very light gold */
  
  /* Neutral palette - warmer tones */
  --neutral-900: #2C2420;        /* Rich brown */
  --neutral-800: #3E2723;        /* Current dark text */
  --neutral-700: #5C5C5C;        /* Current muted */
  --neutral-600: #7C7166;        /* Warm gray */
  --neutral-500: #9C8F7A;        /* Current secondary text - improved */
  --neutral-400: #BCB5A4;        /* Light neutral */
  --neutral-300: #D4CDC1;        /* Very light neutral */
  --neutral-200: #E8E4DB;        /* Surface accent */
  --neutral-100: #F4F1EB;        /* Light surface */
  --neutral-50: #FAF8F5;         /* Lightest surface */
  
  /* Semantic colors */
  --error: #C84D4D;
  --success: #4D9C5C;
  --warning: #D4A440;
  --info: #4D8CC8;
}
```

### 2. Unified Spacing Scale
```css
/* Based on 8px base unit for consistency */
--spacing-xs: 0.5rem;   /* 8px */
--spacing-sm: 0.75rem;  /* 12px */
--spacing-md: 1rem;     /* 16px */
--spacing-lg: 1.5rem;   /* 24px */
--spacing-xl: 2rem;     /* 32px */
--spacing-2xl: 3rem;    /* 48px */
--spacing-3xl: 4rem;    /* 64px */
--spacing-4xl: 6rem;    /* 96px */
```

### 3. Standardized Border Radius
```css
--radius-sm: 12px;      /* Buttons, inputs */
--radius-md: 16px;      /* Cards, small panels */
--radius-lg: 20px;      /* Medium cards */
--radius-xl: 24px;      /* Large sections */
--radius-2xl: 28px;     /* Hero sections */
--radius-full: 9999px;  /* Pills, badges */
```

### 4. Elevation System (Shadows)
```css
--shadow-sm: 0 2px 8px rgba(26, 60, 52, 0.06);
--shadow-md: 0 4px 16px rgba(26, 60, 52, 0.08);
--shadow-lg: 0 8px 24px rgba(26, 60, 52, 0.10);
--shadow-xl: 0 16px 40px rgba(26, 60, 52, 0.12);
--shadow-2xl: 0 24px 60px rgba(26, 60, 52, 0.15);
```

### 5. Typography Scale
```css
/* Enhanced type scale with better progression */
--text-xs: 0.75rem;     /* 12px - captions */
--text-sm: 0.875rem;    /* 14px - small text */
--text-base: 1rem;      /* 16px - body */
--text-lg: 1.125rem;    /* 18px - emphasized body */
--text-xl: 1.25rem;     /* 20px - small headings */
--text-2xl: 1.5rem;     /* 24px - h4 */
--text-3xl: 1.875rem;   /* 30px - h3 */
--text-4xl: 2.25rem;    /* 36px - h2 */
--text-5xl: 3rem;       /* 48px - h1 */
--text-6xl: 3.75rem;    /* 60px - hero */
```

### 6. Enhanced Micro-interactions
- Add subtle scale transforms on button hover
- Implement smooth color transitions (200-300ms)
- Add loading states with skeleton screens
- Implement optimistic UI updates for cart actions

### 7. Improved Component Patterns

#### Buttons
```tsx
// Primary button - bold, high contrast
className="bg-primary-800 text-white hover:bg-primary-900 
           shadow-md hover:shadow-lg transition-all duration-200
           hover:scale-[1.02] active:scale-[0.98]"

// Secondary button - outlined
className="border-2 border-primary-800 text-primary-800 
           hover:bg-primary-50 transition-all duration-200"

// Tertiary button - text only
className="text-primary-800 hover:text-primary-900 
           hover:underline underline-offset-4"
```

#### Cards
```tsx
// Product card - elevated, interactive
className="bg-white border border-neutral-200
           shadow-md hover:shadow-xl transition-all duration-300
           hover:-translate-y-1 rounded-lg"

// Info card - subtle
className="bg-neutral-50 border border-neutral-200
           shadow-sm rounded-lg"
```

---

## Implementation Priority

### Phase 1: Critical (Week 1)

### Phase 2: Important (Week 2)

### Phase 3: Polish (Week 3)

---

## Specific Component Improvements

### Header
**Current Issues:**
- Search input transition could be smoother
- Cart badge needs better visibility
- Mobile menu missing (if needed)

**Improvements:**
- Add backdrop blur to header for premium feel
- Enhance search bar with debounced autocomplete
- Improve cart badge contrast

### Hero Section (Home)
**Current Issues:**
- Gradient can feel overwhelming
- CTA buttons could be more prominent
- Information density is high

**Improvements:**
- Soften gradient (reduce opacity)
- Make primary CTA larger and more prominent
- Add breathing room between sections

### Product Cards
**Current Issues:**
- "Add to cart" button placement inconsistent between variants
- Image aspect ratio could be more flexible
- Hover states need enhancement

**Improvements:**
- Standardize button placement
- Add quick view option on hover
- Implement image zoom on hover
- Add "NEW" or "SALE" badges

### Cart Page
**Current Issues:**
- Quantity controls feel cramped
- Mobile layout needs refinement
- Summary box could be sticky

**Improvements:**
- Larger, more tactile quantity controls
- Sticky summary on desktop
- Add item thumbnails
- Implement remove confirmation

---

## Before/After Comparison

### Color Usage
**Before:**
- `text-[#AC9C7A]` (potentially low contrast)
- Inconsistent hex values throughout

**After:**
- `text-neutral-500` (improved contrast: #9C8F7A)
- Semantic color variables for consistency

### Spacing
**Before:**
- `gap-4`, `gap-5`, `gap-8`, `gap-10`, `gap-12` (arbitrary)

**After:**
- `gap-md`, `gap-lg`, `gap-xl`, `gap-2xl` (systematic)

### Shadows
**Before:**
- `shadow-[0_60px_150px_rgba(26,60,52,0.18)]` (very intense)
- `shadow-[0_20px_60px_rgba(26,60,52,0.08)]` (moderate)

**After:**
- `shadow-xl` (0 16px 40px rgba(26, 60, 52, 0.12))
- `shadow-lg` (0 8px 24px rgba(26, 60, 52, 0.10))

---

## Testing Checklist

### Accessibility
- [ ] All text meets WCAG AA contrast standards
- [ ] Keyboard navigation works throughout
- [ ] Screen reader friendly
- [ ] Focus states visible
- [ ] Color is not the only indicator

### Responsiveness
- [ ] Mobile (375px)
- [ ] Tablet (768px)
- [ ] Desktop (1280px)
- [ ] Large desktop (1920px)

### Browser Testing
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari
- [ ] Mobile Chrome

### Performance
- [ ] Images optimized
- [ ] CSS not bloated
- [ ] Animations performant (60fps)
- [ ] No layout shifts (CLS)

---

## Next Steps

1. **Review & Approve:** Get stakeholder approval on proposed changes
2. **Update Design System:** Implement new CSS variables in `globals.css`
3. **Component Migration:** Update components one by one
4. **Testing:** Comprehensive testing across devices
5. **Deploy:** Gradual rollout with monitoring

---

## Metrics to Track

- **Conversion Rate:** Check if improved UI increases checkout completion
- **Bounce Rate:** Monitor if users stay longer
- **Time on Page:** Measure engagement
- **Cart Abandonment:** Track if improved cart UI reduces abandonment
- **Mobile vs Desktop:** Compare performance across devices


---

## Source: USER-CUSTOMER-LINKAGE-PLAN.md

# User-Customer Linkage Implementation Plan

**Date:** 2026-02-11  
**Priority:** HIGH  

---

## 🎯 Problem Statement

Currently, the system has:
1. **Users** with roles (ADMIN, STAFF, CUSTOMER)
2. **Customers** as separate entities (for POS/business management)
3. **Orders** that require a `customerId`

**Gap:** When a User with role CUSTOMER tries to checkout, there's no automatic linkage to a Customer record.

---

## 📊 Current Schema Analysis

### User Model
```prisma
model User {
  id         Int      @id @default(autoincrement())
  businessId Int
  name       String
  phone      String   @unique
  email      String?  @unique
  passwordHash String?
  role       Role     // ADMIN, STAFF, CUSTOMER
  ...
}
```

### Customer Model
```prisma
model Customer {
  id              Int @id @default(autoincrement())
  businessId      Int
  createdByUserId Int  // Who created this customer (ADMIN/STAFF)
  name            String
  phone           String
  balance         Int @default(0)
  ...
  
  @@unique([businessId, phone])
}
```

### Order Model
```prisma
model Order {
  id Int @id
  businessId Int
  customerId Int  // Required!
  ...
}
```

---

## 🔧 Solution Options

### Option 1: Add userId to Customer (Recommended)
**Pros:**
- Clean separation of concerns
- Maintains current structure
- Flexible (customers can exist without users)
- One user can have ONE customer record

**Cons:**
- Requires schema migration
- Need to handle existing customers

```prisma
model Customer {
  id              Int @id @default(autoincrement())
  businessId      Int
  createdByUserId Int
  userId          Int? @unique  // NEW: Link to User account
  name            String
  phone           String
  balance         Int @default(0)
  ...
}
```

### Option 2: Find/Create Pattern (Quick Fix)
**Pros:**
- No schema change required
- Can implement immediately
- Works with existing data

**Cons:**
- Relies on phone matching
- Potential duplicates if phone changes
- Less explicit relationship

**Implementation:**
```typescript
// When user checks out:
// 1. Find customer by phone
// 2. If not found, create customer
// 3. Link to order
```

---


### Phase 1: Schema Update
1. Add optional `userId` field to Customer model
2. Add unique constraint (one user = one customer)
3. Create migration
4. Run migration

### Phase 2: Service Layer
1. Create `findOrCreateCustomerForUser()` method
2. Update checkout flow to use this method
3. Add endpoint for users to view "their" customer record

### Phase 3: Frontend Integration
1. Update checkout to call new endpoint
2. Show customer info in profile
3. Display order history

---

## 📝 Implementation Steps

### Step 1: Update Prisma Schema
```prisma
model Customer {
  id              Int      @id @default(autoincrement())
  businessId      Int
  createdByUserId Int
  userId          Int?     @unique  // Add this field
  name            String
  phone           String
  balance         Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  business  Business @relation(fields: [businessId], references: [id])\n  createdBy User     @relation(\"CustomerCreatedBy\", fields: [createdByUserId], references: [id])
  user      User?    @relation(\"UserCustomer\", fields: [userId], references: [id])  // Add this relation
  orders    Order[]
  appointments Appointment[]

  @@unique([businessId, phone])
  @@index([businessId])
  @@index([userId])  // Add this index
}

model User {
  ...
  customerRecord Customer? @relation(\"UserCustomer\")  // Add this relation
  ...
}
```

### Step 2: Create Migration
```bash
npx prisma migrate dev --name add_user_customer_link
```

### Step 3: Add Service Method
```typescript
// In customers.service.ts
async findOrCreateForUser(
  currentUser: JwtPayload
): Promise<CustomerSummary> {
  const businessId = Number(currentUser.businessId);
  const userId = Number(currentUser.userId);

  // Check if user already has a customer record
  let customer = await this.prisma.customer.findUnique({
    where: { userId },
    select: {
      id: true,
      name: true,
      phone: true,
      balance: true,
    },
  });

  if (customer) {
    return customer;
  }

  // Get user data
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  // Create customer record
  customer = await this.prisma.customer.create({
    data: {
      businessId,
      createdByUserId: userId,  // Self-created
      userId,
      name: user.name,
      phone: user.phone,
      balance: 0,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      balance: true,
    },
  });

  return customer;
}
```

### Step 4: Add Controller Endpoint
```typescript
// In customers.controller.ts
@Get('me')
@Roles('CUSTOMER', 'STAFF', 'ADMIN')
@ApiOperation({
  summary: 'Get or create customer record for current user',
  description: 'Returns the customer record linked to the authenticated user. Creates one if it doesn\'t exist.',
})
@ApiOkResponse({ description: 'Customer record for the current user.' })
getMyCustomerRecord(@Req() req: { user: JwtPayload }) {
  return this.customersService.findOrCreateForUser(req.user);
}
```

### Step 5: Update Orders Service
```typescript
// In orders.service.ts - when creating order
async create(currentUser: JwtPayload, payload: CreateOrderDto) {
  let customerId: number;

  if (currentUser.role === 'CUSTOMER') {
    // For CUSTOMER users, find or create their customer record
    const customer = await this.customersService.findOrCreateForUser(currentUser);
    customerId = customer.id;
  } else {
    // For ADMIN/STAFF, they specify the customer
    customerId = payload.customerId;
  }

  // Create order with customerId
  const order = await this.prisma.order.create({
    data: {
      businessId: Number(currentUser.businessId),
      customerId,
      createdByUserId: Number(currentUser.userId),
      statusId: payload.statusId,
      totalAmountCents: payload.totalAmountCents,
      source: OrderSource.WEB,
      notes: payload.notes,
    },
  });

  return order;
}
```

### Step 6: Frontend Integration

#### Update Checkout Service
```typescript
// services/api.ts or checkout service
export const getOrCreateCustomer = async () => {
  const response = await api.get('/customers/me');
  return response.data;
};
```

#### Update Checkout Flow
```typescript
// In checkout page/component
const handleCheckout = async () => {
  try {
    // Ensure customer record exists
    const customer = await getOrCreateCustomer();
    
    // Create order
    const order = await createOrder({
      items: cartItems,
      // customerId is handled by backend based on authenticated user
    });
    
    // Proceed to payment
    router.push(`/orders/${order.id}/payment`);
  } catch (error) {
    toast.error('Checkout failed');
  }
};
```

---

## 🧪 Testing Checklist

### Backend Tests
- [ ] User with CUSTOMER role can get/create customer record
- [ ] Customer record is created with correct data
- [ ] Subsequent calls return existing customer (no duplicates)
- [ ] Orders are created with correct customerId
- [ ] ADMIN/STAFF can still create customers manually
- [ ] Phone uniqueness is maintained per business

### Frontend Tests
- [ ] Checkout flow works for authenticated users
- [ ] Customer info displayed in profile
- [ ] Order history shows correctly
- [ ] Guest checkout handled (if applicable)
- [ ] Error states displayed properly

### Edge Cases
- [ ] User changes phone number
- [ ] User with existing customer (migration scenario)
- [ ] Concurrent requests (race conditions)
- [ ] Different businesses (multi-tenant)

---

## 🚀 Deployment Plan

### Phase 1: Database
1. Review schema changes
2. Create migration
3. Test migration on dev database
4. Backup production database
5. Run migration on production

### Phase 2: Backend
1. Deploy new service methods
2. Deploy new endpoints
3. Update orders service
4. Monitor logs for errors

### Phase 3: Frontend
1. Deploy checkout updates
2. Test end-to-end flow
3. Monitor checkout completion rates

---

## 📋 Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration fails | HIGH | Test thoroughly, have rollback plan |
| Duplicate customers | MEDIUM | Unique constraint on userId, data cleanup script |
| Phone number changes break link | LOW | userId is primary link, phone is secondary |
| Performance impact | LOW | Proper indexing on userId |

---

## 🎯 Success Criteria


---

## 📚 Documentation Updates Needed

1. API documentation (Swagger)
2. Database schema documentation
3. Developer guide for checkout flow
4. User guide for account/orders

---

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Create Prisma migration** for schema update
3. **Implement service methods** in customers.service.ts
4. **Add controller endpoints** in customers.controller.ts
5. **Update orders service** to use new linkage
6. **Test thoroughly** on development environment
7. **Update frontend** checkout flow
8. **Deploy to staging** for QA
9. **Deploy to production** with monitoring

---

Ready to proceed with implementation? 🚀


---

## Source: LIB-STRUCTURE-PLAN.md

# 📁 NUTOPIANO - LIB YAPISI AUDIT & DÜZENLEME PLANI

**Tarih**: 18 Şubat 2026  
**Amaç**: Backend ve Frontend kütüphane yapısını optimize etmek  
**Çıktı**: Production-ready folder structure

---

## 🔍 KÜTÜPHANEYİ YAPISI AUDIT

### Backend Analizi

**Mevcut Yapı:**
```
backend/src/
├── app.module.ts
├── app.controller.ts
├── app.service.ts
├── main.ts
├── auth/
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── dto/
│   ├── strategies/
│   └── types/
├── core/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   └── interceptors/
├── database/
├── email/
├── modules/
│   ├── appointments/
│   ├── categories/
│   ├── customers/
│   ├── order-status/
│   ├── orders/
│   ├── products/
│   ├── settings/
│   ├── uploads/
│   └── users/
└── dev/
```

**Eksiklikler:**
- ❌ `common/` (shared utilities, helpers) yok
- ❌ `config/` (environment config) yok
- ❌ `constants/` (enums, app constants) yok
- ❌ `exceptions/` (custom error handling) yok
- ❌ `middleware/` (rate limiting, logging) yok
- ❌ `pipes/` (custom validation pipes) yok
- ❌ `services/` (cross-cutting services) yok

---

### Frontend Analizi

**Mevcut Yapı:**
```
frontend/src/
├── app/
│   └── [various routes]
├── components/
│   ├── admin/
│   ├── checkout/
│   ├── common/
│   ├── layout/
│   ├── AuthModal.tsx
│   ├── CategoryCard.tsx
│   ├── CategoryTile.tsx
│   ├── CategoryTree.tsx
│   ├── Footer.tsx
│   ├── Header.tsx
│   ├── ProductCard.tsx
│   └── SiteFooter.tsx
├── services/
│   └── api.ts (sadece 1 dosya!)
├── store/
│   ├── cartSlice.ts
│   ├── userSlice.ts
│   └── index.ts
└── utils/
    ├── helpers.ts
    ├── site.ts
    └── storeCategories.ts
```

**Eksiklikler:**
- ❌ `hooks/` (custom React hooks) yok
- ❌ `types/` (TypeScript interfaces/types) yok
- ❌ `constants/` (app constants) yok
- ❌ `context/` (React context yok ma?)
- ❌ `lib/` (3rd-party library wrappers) yok
- ❌ `api/` (API client/endpoints separate) yok
- ❌ `styles/` (global styles, theme) yok
- ❌ `.env.example` yok

---

## 🛠️ DÜZENLEME PLANI

### A. BACKEND

#### Phase 1: Core Folder Structure (2 hours)

**1. `src/common/` Oluştur**
```
src/common/
├── constants/
│   ├── app.constants.ts       # Genel app constants
│   ├── error.constants.ts     # Error codes
│   ├── messages.ts            # Success/error messages (TR)
│   ├── pagination.ts          # Default pagination values
│   └── roles.ts               # Role constants (SUPER_ADMIN, SELLER, CUSTOMER)
│
├── decorators/                # Already in core/, move here
│   ├── index.ts
│   └── public.decorator.ts
│
├── dtos/
│   ├── pagination.dto.ts      # Reusable pagination DTO
│   ├── response.dto.ts        # Standard API response DTO
│   └── query-filter.dto.ts    # Generic filter DTO
│
├── enums/
│   ├── index.ts
│   ├── user-role.enum.ts
│   ├── order-status.enum.ts
│   ├── seller-status.enum.ts
│   └── commission-status.enum.ts
│
├── exceptions/
│   ├── base.exception.ts      # Custom base exception
│   ├── business.exception.ts  # Business logic exceptions
│   └── validation.exception.ts
│
├── filters/                   # Already in core/, move here
│   ├── index.ts
│   └── http-exception.filter.ts
│
├── guards/                    # Already in core/, move here
│   ├── index.ts
│   ├── jwt-auth.guard.ts
│   ├── roles.guard.ts
│   └── optional-jwt.guard.ts (yeni)
│
├── interceptors/              # Already in core/, move here
│   ├── index.ts
│   ├── response.interceptor.ts
│   ├── logging.interceptor.ts (yeni)
│   └── transform.interceptor.ts (yeni)
│
├── middleware/
│   ├── index.ts
│   ├── rate-limit.middleware.ts (yeni)
│   ├── audit-log.middleware.ts (yeni)
│   └── error-handling.middleware.ts (yeni)
│
├── pipes/
│   ├── index.ts
│   ├── validation.pipe.ts (custom)
│   └── parse-id.pipe.ts (yeni)
│
├── services/
│   ├── logger.service.ts      # Winston or standard logger
│   ├── audit.service.ts       # Audit logging
│   └── notification.service.ts (yeni) # Email/SMS notifications
│
└── utils/
    ├── index.ts
    ├── string.utils.ts (trim, slugify, etc.)
    ├── crypto.utils.ts (hash, encrypt)
    ├── date.utils.ts (formatters)
    ├── pagination.utils.ts
    └── validation.utils.ts (email, phone regex)
```

**2. `src/config/` Oluştur**
```
src/config/
├── index.ts
├── database.config.ts         # PostgreSQL/Prisma config
├── jwt.config.ts               # JWT settings
├── cors.config.ts              # CORS whitelist
├── email.config.ts             # SMTP settings
├── file-upload.config.ts       # Multer/Storage config
└── environment.ts              # Type-safe environment variables
```

**3. `src/database/` Yapısıyla İlgili**
```
src/database/
├── prisma.service.ts
└── seeds/
    ├── index.ts
    ├── seed-plans.ts             # Seed Plan data
    ├── seed-order-statuses.ts    # Seed OrderStatus data
    └── seed-roles.ts              # Seed initial roles
```

**4. `src/core/` Yeniden Organize Et**
```
src/core/
├── index.ts                   # Export all core modules
├── decorators/                # Move from here ↓
├── exceptions/                # Move from here ↓
├── filters/                   # Move from here ↓
├── guards/                    # Move from here ↓
├── interceptors/             # Move from here ↓
└── pipes/                     # Keep here, pipes for validation
```

#### Phase 2: Module Structure Update (2 hours)

**Current module pattern problem:**
```
modules/orders/
├── orders.controller.ts
├── orders.service.ts
├── orders.module.ts
└── dto/
```

**Better pattern:**
```
modules/orders/
├── src/
│   ├── dto/
│   │   ├── create-order.dto.ts
│   │   ├── update-order.dto.ts
│   │   ├── filter-order.dto.ts (yeni)
│   │   └── order-response.dto.ts (yeni - for API response)
│   │
│   ├── entities/
│   │   └── order.entity.ts (yeni - Prisma model as entity)
│   │
│   ├── interfaces/
│   │   └── order.interface.ts (yeni - business logic interfaces)
│   │
│   ├── orders.controller.ts (endpoint definitions)
│   ├── orders.service.ts (business logic)
│   ├── orders.module.ts
│   └── orders.repository.ts (yeni - database queries)
│
└── test/
    ├── orders.controller.spec.ts
    ├── orders.service.spec.ts
    └── orders.e2e-spec.ts
```

#### Phase 3: Shared Services (1 hour)

**New `src/services/` folder:**
```
src/services/
├── index.ts
│
├── mail/
│   ├── mail.service.ts       # Email sending
│   ├── mail.templates.ts     # Email templates
│   └── mail.types.ts         # Email DTOs
│
├── notification/
│   ├── notification.service.ts # SMS/Push notifications
│   └── notification.types.ts
│
├── storage/
│   ├── storage.service.ts    # File upload/S3
│   └── storage.types.ts
│
├── audit/
│   ├── audit.service.ts      # Audit logging
│   └── audit.types.ts
│
└── cache/
    └── cache.service.ts       # Redis cache wrapper
```

---

### B. FRONTEND

#### Phase 1: Folder Structure (2 hours)

**1. `src/types/` Oluştur**
```
src/types/
├── index.ts
├── api.types.ts               # API response types
├── models.types.ts            # Data models (User, Product, Order, etc.)
├── common.types.ts            # Common types (Pagination, Filter, etc.)
├── form.types.ts              # Form-related types
└── enums.ts                   # Frontend enums (UserRole, OrderStatus, etc.)
```

**2. `src/constants/` Oluştur**
```
src/constants/
├── index.ts
├── app.constants.ts           # App-level constants
├── api.constants.ts           # API URLs, timeout values
├── validation.constants.ts    # Form validation rules
├── messages.ts                # Success/error messages (TR)
├── roles.ts                   # User roles
└── status.ts                  # Order/Seller status options
```

**3. `src/hooks/` Oluştur**
```
src/hooks/
├── index.ts
│
├── useAuth.ts                 # Authentication hook
├── useFetch.ts                # Data fetching hook
├── useForm.ts                 # Form handling hook
├── usePagination.ts           # Pagination logic
├── useLocalStorage.ts         # Local storage sync
├── useDebounce.ts             # Debounce utility
│
└── api/                       # Custom API hooks
    ├── useOrders.ts
    ├── useProducts.ts
    ├── useCustomers.ts
    └── useSellers.ts
```

**4. `src/lib/` Oluştur**
```
src/lib/
├── index.ts
│
├── api-client.ts              # Axios instance + interceptors
├── date.ts                    # Date formatting utilities
├── string.ts                  # String utilities
├── format.ts                  # Number, currency formatting
├── validation.ts              # Form validation schemas (Zod/Yup)
└── cn.ts                      # Classname utility (clsx)
```

**5. `src/api/` Oluştur**
```
src/api/
├── index.ts
│
├── auth.api.ts                # Auth endpoints
├── products.api.ts            # Product endpoints
├── orders.api.ts              # Order endpoints
├── customers.api.ts           # Customer endpoints
├── sellers.api.ts             # Seller endpoints (platform admin)
└── common.api.ts              # Shared endpoints (settings, etc.)
```

**6. `src/styles/` Oluştur**
```
src/styles/
├── globals.css                # Global styles
├── variables.css              # CSS variables (colors, spacing)
├── utilities.css              # Utility classes
└── theme.ts                   # Tailwind theme config (if separate)
```

**7. Reorganize `src/components/`**
```
src/components/
├── common/                    # Shared components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   ├── Spinner.tsx
│   ├── Badge.tsx
│   ├── Pagination.tsx
│   ├── Breadcrumb.tsx
│   └── index.ts
│
├── layout/                    # Layout components
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Sidebar.tsx
│   ├── Navbar.tsx
│   ├── LayoutWrapper.tsx
│   └── index.ts
│
├── forms/                     # Form components (yeni)
│   ├── FormField.tsx
│   ├── FormError.tsx
│   ├── FormLabel.tsx
│   └── index.ts
│
├── admin/                     # Admin-specific
│   ├── SellerList.tsx
│   ├── DashboardCard.tsx
│   └── index.ts
│
├── checkout/                  # Checkout flow
│   ├── CartSummary.tsx
│   ├── PaymentForm.tsx
│   └── index.ts
│
├── product/                   # Product-related (yeni)
│   ├── ProductCard.tsx
│   ├── ProductGrid.tsx
│   ├── ProductDetail.tsx
│   └── index.ts
│
├── order/                     # Order-related (yeni)
│   ├── OrderCard.tsx
│   ├── OrderList.tsx
│   ├── OrderDetail.tsx
│   └── index.ts
│
└── auth/                      # Auth-related (yeni)
    ├── AuthModal.tsx
    ├── LoginForm.tsx
    ├── RegisterForm.tsx
    └── index.ts
```

**8. Update `src/store/`**
```
src/store/
├── index.ts
│
├── slices/                    # Redux slices (yeni folder)
│   ├── user.slice.ts
│   ├── cart.slice.ts
│   ├── orders.slice.ts (yeni)
│   ├── products.slice.ts (yeni)
│   └── index.ts
│
├── hooks.ts                   (yeni - Redux hooks)
├── store.ts                   (existing index → renamed)
└── types.ts                   (yeni - Redux types)
```

**9. Update `src/services/`**
```
src/services/
├── index.ts
├── api.ts         (existing, rename → api-client.ts)
├── storage.ts     (yeni - localStorage)
├── analytics.ts   (yeni - if needed)
└── tracking.ts    (yeni - event tracking)
```

**10. `src/middleware/` (yeni)**
```
src/middleware/
├── index.ts
├── auth.middleware.ts         # Protected route check
└── error-handler.ts           # Global error handling
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Backend (Priority Order)

**Week 1:**
- [ ] **Task 1**: Create `src/common/constants/` folder structure
  - [ ] `app.constants.ts`
  - [ ] `roles.ts`
  - [ ] `error.constants.ts`
  - [ ] `messages.ts`
  - Time: 30 min

- [ ] **Task 2**: Create `src/common/enums/` folder
  - [ ] `user-role.enum.ts`
  - [ ] `order-status.enum.ts`
  - [ ] `seller-status.enum.ts`
  - Time: 30 min

- [ ] **Task 3**: Move and reorganize `src/core/*` → `src/common/`
  - [ ] Move decorators/filters/guards/interceptors
  - [ ] Update imports in all files
  - Time: 1 hour

- [ ] **Task 4**: Create `src/config/` folder
  - [ ] `environment.ts` (type-safe env vars)
  - [ ] `jwt.config.ts`
  - [ ] `cors.config.ts`
  - Time: 1 hour

- [ ] **Task 5**: Create `src/common/utils/` folder
  - [ ] `string.utils.ts`
  - [ ] `validation.utils.ts`
  - [ ] `pagination.utils.ts`
  - Time: 1 hour

- [ ] **Task 6**: Refactor `main.ts` to use config
  - [ ] Import CORS from config
  - [ ] Import JWT from config
  - [ ] Update error handling filter
  - Time: 1 hour

- [ ] **Task 7**: Create `src/common/dtos/` folder
  - [ ] `pagination.dto.ts`
  - [ ] `response.dto.ts`
  - [ ] `query-filter.dto.ts`
  - Time: 45 min

- [ ] **Task 8**: Create `src/common/middleware/` folder
  - [ ] `rate-limit.middleware.ts`
  - [ ] Register in main.ts
  - Time: 1 hour

**Week 2:**
- [ ] **Task 9**: Refactor modules to include `.repository.ts`
  - [ ] Start with `orders` module
  - [ ] Extract all Prisma queries to repository
  - [ ] Update service to use repository
  - Time: 2 hours per module

- [ ] **Task 10**: Create `src/services/` folder
  - [ ] `mail/` subdirectory
  - [ ] `notification/` subdirectory
  - [ ] `audit/` subdirectory
  - Time: 2 hours

- [ ] **Task 11**: Update all imports after refactor
  - [ ] Run linting: `npm run lint`
  - [ ] Fix all import errors
  - Time: 1 hour

- [ ] **Task 12**: Test backend after refactor
  - [ ] Run tests: `npm run test:e2e`
  - [ ] Fix any test failures
  - Time: 1 hour

---

### Frontend (Priority Order)

**Week 1:**
- [ ] **Task 1**: Create `src/types/` folder
  - [ ] `index.ts`
  - [ ] `models.types.ts`
  - [ ] `api.types.ts`
  - [ ] `common.types.ts`
  - Time: 1 hour

- [ ] **Task 2**: Create `src/constants/` folder
  - [ ] `app.constants.ts`
  - [ ] `api.constants.ts`
  - [ ] `messages.ts`
  - [ ] `status.ts`
  - Time: 1 hour

- [ ] **Task 3**: Create `src/hooks/` folder
  - [ ] `useAuth.ts`
  - [ ] `useFetch.ts`
  - [ ] `useForm.ts`
  - Time: 1.5 hours

- [ ] **Task 4**: Create `src/lib/` folder
  - [ ] `api-client.ts` (Axios with interceptors)
  - [ ] `validation.ts` (Zod schemas)
  - [ ] `format.ts` (number/date formatting)
  - Time: 1.5 hours

- [ ] **Task 5**: Create `src/api/` folder
  - [ ] `auth.api.ts` (API endpoints)
  - [ ] `products.api.ts`
  - [ ] `orders.api.ts`
  - Time: 1 hour

- [ ] **Task 6**: Reorganize `src/components/`
  - [ ] Move components into subdirectories
  - [ ] Create `index.ts` files for exports
  - [ ] Update all imports
  - Time: 2 hours

- [ ] **Task 7**: Reorganize `src/store/`
  - [ ] Create `slices/` folder
  - [ ] Create `hooks.ts` (useAppDispatch, useAppSelector)
  - [ ] Update imports
  - Time: 1 hour

**Week 2:**
- [ ] **Task 8**: Create `.env.example` file
  - [ ] Document all env vars
  - [ ] Add descriptions
  - Time: 30 min

- [ ] **Task 9**: Update imports everywhere
  - [ ] Run linting: `npm run lint`
  - [ ] Fix import errors
  - Time: 1 hour

- [ ] **Task 10**: Test frontend after refactor
  - [ ] `npm run build`
  - [ ] Check for build errors
  - Time: 1 hour

- [ ] **Task 11**: Create `src/styles/` folder
  - [ ] Move global CSS
  - [ ] Create theme config
  - Time: 1 hour

---

## 📊 SUMMARY

```
TOTAL TASKS:        23
TOTAL TIME:         ~35-40 hours
TEAM SIZE:          1-2 developers
TIMELINE:           2 weeks
DIFFICULTY:         Medium (mostly file moves + import updates)

BACKEND IMPACT:
- Before: 1 large src/ folder
- After: Well-organized, reusable structure

FRONTEND IMPACT:
- Before: Mixed component organization
- After: Feature-based folder structure with proper separation

BENEFITS:
```

---

## 🎯 POST-REFACTORING

**Day 1 After Refactor:**
1. Run full test suite: `npm run test:e2e` (Backend)
2. Build production: `npm run build` (Frontend)
3. Check for any import errors
4. Run linting: `npm run lint`

**Documentation:**
- [ ] Update project README with new folder structure
- [ ] Create `docs/architecture.md` explaining folder organization
- [ ] Document any new conventions

---

## ⚡ QUICK START

**If you want to start NOW:**

1. **Backend First (easier):**
   - [ ] Task #1-5 dari Backend checklist
   - Start with constants & enums (safe operations)

2. **Then Frontend:**
   - [ ] Task #1-4 dari Frontend checklist
   - Create types, constants, hooks

3. **Finally, Integration:**
   - Update imports everywhere
   - Test everything

**Estimated time if done in parallel:** 5-7 days (1-2 devs)

---

**Ready to start?** Pick the first task and begin! 🚀


---

## Source: COMMERCE-CORE-TR-GLOBAL-90D-EXECUTION-PLAN.md

# Nutopiano Commerce Core Execution Plan (TR First, Global Ready)

Tarih: 24 Subat 2026  
Durum: Plan (implementasyon baslamadi)  
Sure: 90 gun (12 hafta)  
Hedef: Shopify + POS Faz-1'i finansal dogrulukla canliya almak ve ayni cekirdegi global extension'a hazirlamak.

---

## 1) Kapsam ve Basari Olcumu

Faz-1 kapsami:
- Seller onboarding
- Marketplace gezinti: market -> seller -> category -> product
- Online satis: sepet -> checkout -> order
- POS satis: offline-first queue + sync
- Gun sonu raporu
- Finansal dogruluk: commission, payout hesap, snapshot freeze, immutable ledger

Faz-1 disi:
- Visual rule builder
- Advanced/tier/surge pricing
- Multi-currency
- Multi-region VAT
- Uber/Booking domain kurallari

90. gun sonunda "done" tanimi:
- Order hesaplamasi pipeline uzerinden calisiyor.
- Snapshot freeze alanlari order'a yaziliyor ve eski orderlar rule degisikliginden etkilenmiyor.
- Ledger immutable append-only calisiyor.
- Payout request -> admin paid akisi ledger ile tutarli.
- POS offline queue duplicate olusturmadan sync oluyor.

---

## 2) Mevcut Kod Baseline (Bugunden Baslangic)

Pozitif durum:
- Order idempotency var: `Idempotency-Key` + `Order(businessId, idempotencyKey)` unique.
- POS offline queue var: `frontend/src/lib/offline/pos-order-queue.ts` (IndexedDB + retry backoff).
- Cash register session endpointleri var: `backend/src/modules/pos/pos.controller.ts`.
- Order'da snapshot benzeri temel alanlar var: subtotal/tax/discount/commissionSnapshot/total.
- Outbox ve audit altyapisi mevcut.

Gap'ler:
- Hesaplama logic'i tek parca: `backend/src/modules/orders/orders.service.ts` icinde monolitik.
- TR adaptation ve extension layer ayrimi yok.
- Platform/seller wallet + double-entry ledger yok.
- Commission bugun "final status'te upsert" mantiginda; order create snapshot pipeline ile bagli degil.
- Payout bugun `Commission/Payout` aggregate modeli ile gidiyor; immutable ledger tabanli degil.
- POS price mismatch bugun "reject" davranisi veriyor; Faz-1 kararina gore "ACCEPT + FLAG" olmasi gerekiyor.
- POS order create akisinda "aktif kasa oturumu zorunlu" backend seviyesinde hard gate degil.

---

## 3) Kilitlenen Kararlar (Bu Planin Sabitleri)

Roller:
- SUPER_ADMIN
- ADMIN
- SELLER
- STAFF (ayri kalacak)
- CUSTOMER

Policy:
- Refund default: Model A (commission iade edilir, ters ledger entry ile).
- POS price mismatch: ACCEPT + FLAG.
- Payout modeli: Seller request + admin manuel paid.
- Snapshot/ledger prensibi: immutable ve deterministic.

---

## 4) Hedef Mimari (3 Katman)

Katman-1 Commerce Core (immutable):
- Order engine
- Calculation engine (pipeline)
- Commission engine
- Tax engine
- Snapshot freeze
- Refund engine (minimal)
- Payoutability hesaplama
- Audit trail

Katman-2 TR Adaptation (gecici ama temiz):
- KDV: 1/8/20
- Currency: TRY
- Commission: percentage/fixed/category override (minimal)
- Discount: order/item percentage/flat

Katman-3 Extension Layer (global-ready):
- Multi-tax / multi-currency / FX
- Local compliance hooks
- Domain-specific pricing hooks
- Tier commission
- Multi-party split

---

## 5) Hedef Repo Yerlesimi

Backend:
- `backend/src/core/commerce/engine/`
- `backend/src/core/commerce/engine/steps/`
- `backend/src/core/commerce/contracts/`
- `backend/src/core/commerce/snapshot/`
- `backend/src/core/commerce/ledger/`
- `backend/src/core/commerce/payout/`
- `backend/src/core/commerce/channel/`
- `backend/src/core/commerce/adaptation/tr/`
- `backend/src/core/commerce/extensions/`

Frontend:
- `frontend/src/lib/offline/` (mevcut queue genisletmesi)
- `frontend/src/app/pos/` (price mismatch warning + queue observability + cash session gate)
- `frontend/src/app/admin/finance/` (commission + payout + mismatch monitor)

---

## 6) Veri Modeli Plani (Prisma)

### 6.1 Order snapshot alanlari

Mevcutta var:
- subtotalAmountCents
- discountAmountCents
- taxAmountCents
- commissionSnapshotCents
- totalAmountCents

Eklenecek:
- platformRevenueCents
- sellerPayoutCents
- currency (default TRY)
- calculationProfileId
- calculationVersion
- breakdownJson
- priceMismatch (bool, default false)
- priceMismatchMetaJson (optional, audit icin)

### 6.2 Ledger/Wallet tablolari

Yeni:
- `SellerWallet` (available/pending/currency)
- `PlatformWallet` (available/pending/reserve/currency)
- `LedgerEntry` (accountType, direction, amount, currency, orderId, type, metadata)
- `PayoutRequest` (sellerId, amount, status REQUESTED/APPROVED/PAID/REJECTED)

Kurallar:
- Ledger update yok (append-only).
- Snapshot olusmadan ledger yazilmaz.
- Pending -> available gecis kurallari acik ve testli olacak.

### 6.3 Gecis notu

Gecis surecinde mevcut `Commission` ve `Payout` modelleri rapor/geriye uyumluluk icin korunacak.
Yeni ledger akisi stabil olduktan sonra bu modeller "derived/reporting" role'una cekilecek.

---

## 7) Calculation Engine Teknik Cekirdek

Kontrat:
- `CalculationContext`
- `CalculationResult`
- `CalculationStep`

Pipeline:
1. pricingStep
2. discountStep
3. taxStep
4. commissionStep
5. deliveryStep
6. roundingStep
7. finalizeStep

Kural:
- Tum stepler pure olacak.
- Tum adimlar breakdownJson'a yazacak.
- calculationVersion step sirasini ve rule profile hash'ini temsil edecek.

TR Faz-1 minimum rules:
- Commission: percentage/fixed/category override
- Tax: KDV 1/8/20
- Discount: basic percentage/fixed

---

## 8) Kanal Akisi ve POS Kurallari

Ortak akisi:
- Channel -> Seller -> Rule Profile -> Calculation Engine -> Snapshot -> Ledger

Channel farki:
- POS: unitPrice snapshot input kabul eder (offline-first).
- Marketplace/Online: fiyat server source-of-truth.

POS price mismatch (ACCEPT + FLAG):
- `expectedUnitPriceCents` ile server price farkinda order reject edilmeyecek.
- Order hesaplama server tarafinda yapilacak.
- `order.priceMismatch=true` + mismatch meta audit log yazilacak.
- Admin risk panelinde mismatch listelenecek.

Cash session gate:
- POS source order create, aktif register session yoksa 422 donecek.
- Session kimligi (sessionId/registerCode) order create payload veya header ile tasinacak.

---

## 9) 90 Gunluk Uygulama Takvimi

## Ay-1 (Hafta 1-4): Commerce Core ve Finansal Dogruluk

Hafta 1:
- Commerce core module skeleton ac.
- Calculation contracts ve test harness kur.
- ADR-001: snapshot freeze policy.
- ADR-002: ledger accounting model.

Hafta 2:
- Pricing + discount + tax step implementasyonu.
- TR KDV adaptation (1/8/20).
- calculationVersion ve breakdownJson altyapisi.

Hafta 3:
- Commission step (percentage/fixed/category override minimal).
- Snapshot alanlarini order create'e bagla.
- Determinism testleri (aynı input -> ayni output).

Hafta 4:
- Wallet/ledger tablolari + write service.
- Order create sonrasi ledger posting (phase-1 minimal).
- Regression pack (orders + finance + pos smoke).

Ay-1 cikti:
- Pipeline canli.
- Snapshot freeze aktif.
- Immutable ledger minimal aktif.

## Ay-2 (Hafta 5-8): Marketplace + POS Hardening

Hafta 5:
- POS create order akisina cash session zorunlulugu.
- POS source icin price mismatch ACCEPT + FLAG.
- Idempotency collision test matrisi.

Hafta 6:
- Offline queue sync conflict stratejisi guncelle.
- Duplicate order prevention e2e.
- Queue observability metrikleri (pending, retry, drop reason).

Hafta 7:
- Market -> seller -> category -> product listing stabilizasyonu.
- Checkout -> order create pipeline entegrasyonu.
- Channel bazli rule profile secimi.

Hafta 8:
- Gun sonu raporu ile ledger mutabakat kontrolleri.
- POS raporlari ile payment/order tutarlilik kontrolu.
- UAT bugfix sprint.

Ay-2 cikti:
- Offline satis duplicate olmadan sync oluyor.
- POS raporlari ledger ile tutarli.

## Ay-3 (Hafta 9-12): Para Akislari, Refund, Stabilite

Hafta 9:
- Payout request -> approve -> paid akisi (ledger tabanli).
- Admin payout ekrani.
- Seller payoutability endpoint.

Hafta 10:
- Refund minimal engine (orijinal snapshot ters kayit).
- Commission iade policy Model A implementasyonu.
- Refund + payout race-condition testleri.

Hafta 11:
- Performance hardening (index, hot query optimize, N+1 tarama).
- Outbox/audit olaylarini finance aksiyonlariyla zenginlestir.
- Monitoring dashboard (mismatch, payout latency, sync errors).

Hafta 12:
- UAT release checklist kapanis.
- Shadow compare raporu (old calc vs pipeline).
- Production cutover + rollback runbook.

Ay-3 cikti:
- Payout hesaplari snapshot + ledger ile uyumlu.
- Refund original snapshot uzerinden calisiyor.

---

## 10) Test Stratejisi (Zorunlu)

Unit:
- Her calculation step icin pure-function testleri.
- Round/precision testleri.

Integration:
- Snapshot freeze degisik rule senaryolari.
- Ledger posting atomic transaction testleri.
- Idempotency tekrar istek testleri.

E2E:
- POS offline queue sync (network flap).
- Price mismatch ACCEPT + FLAG flow.
- Cash session zorunlu satis akisi.
- Payout full lifecycle.
- Refund ters kayit akisi.

Non-functional:
- P95 order create latency hedefi.
- Deadlock/retry senaryolari.
- Veri tutarlilik assertion job'lari.

---

## 11) Riskler ve Onlemler

Risk:
- Monolitik orders.service refactor regression.
Onlem:
- Parallel shadow calculate + golden master test seti.

Risk:
- Ledger migration sonrasi rapor sapmasi.
Onlem:
- Eski raporla yeni raporu bir sure paralel karsilastir.

Risk:
- POS offline davranis degisince operasyonel sürtünme.
Onlem:
- UI warning, queue reason labels, saha UAT senaryolari.

Risk:
- Payout state race condition.
Onlem:
- Status transition CAS (`updateMany where status=...`) + audit.

---

## 12) Ilk 10 Is Gunu Icinde Acilacak Issue Paketi

1. Core module skeleton + contracts
2. Calculation pipeline v1 (pricing/discount/tax/commission/finalize)
3. Order snapshot schema migration
4. Ledger + wallet schema migration
5. Ledger write service + transaction boundaries
6. POS mismatch policy degisikligi (reject -> accept+flag)
7. Cash session gate for POS order create
8. PayoutRequest yeni lifecycle + admin paid flow
9. Refund minimal reverse-ledger akisi
10. Test harness + smoke + e2e baseline

---

## 13) Definition of Done (Faz-1 Final)

- Hesaplama deterministik ve versioned.
- Snapshot freeze sonrasi order finansallari degismiyor.
- Ledger immutable, update yok.
- Payout ve refund islemleri snapshot referansli.
- POS offline sync duplicate uretemiyor.
- Operasyon ekipleri icin mismatch/payout/ledger monitor ekranlari hazir.



---

## Source: START-TODAY.md

# 🚀 NUTOPIANO - BUGÜN BAŞLA (Quick Start)

**Tarih**: 18 Şubat 2026  
**Hedef**: Şu hafta (18-22 Şubat) 5 güvenlik düzeltmesi bitirmek

---

## 📋 ÖNCELİKLİ SORUNLAR (Hemen Düzelt)

Aşağıdaki 5 kritik sorunu bu gün başlayıp 3 gün içinde bitir:

### 1️⃣ CORS Ayarlarını Düzelt (30 min)

**Dosya**: `backend/src/main.ts` (satır 24)

**Şu an**:
```typescript
app.enableCors({
  origin: true,  // ❌ HERKESİN ERİŞEBİLDİĞİ!
  credentials: true,
});
```

**Değiştir**:
```typescript
app.enableCors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3002').split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600,
});
```

**`.env` dosyasına ekle**:
```
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3002,https://yourdomain.com
```


---

### 2️⃣ JWT Token Expiration Ekle (45 min)

**Dosya**: `backend/src/auth/auth.service.ts` (satır ~70)

**Şu an**:
```typescript
return {
  accessToken: this.jwtService.sign(payload),  // ❌ Süresi sonsuz!
};
```

**Değiştir**:
```typescript
return {
  accessToken: this.jwtService.sign(payload, { 
  }),
  refreshToken: this.jwtService.sign(
    { userId: payload.userId, type: 'refresh' },
    { expiresIn: '7d' }  // Refresh token 7 gün geçerli
  ),
};
```

**Aynı şeyi `register()` method'unda da yap** (satır ~140)

**JWT Strategy'de güncelle**:
`backend/src/auth/strategies/jwt.strategy.ts`
```typescript
JwtModule.register({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  signOptions: {
    expiresIn: '15m',  // Default expiration
  },
}),
```


---

### 3️⃣ Şifre Validasyonu Güçlendir (45 min)

**Dosya**: `backend/src/auth/dto/register.dto.ts` ve `change-password.dto.ts`

**Şu an**:
```typescript
@MinLength(6)  // ❌ Çok zayıf!
password: string;
```

**Değiştir**:
```typescript
@MinLength(12, { 
  message: 'Şifre en az 12 karakter olmalı' 
})
@Matches(/[A-Z]/, { 
  message: 'Büyük harf (A-Z) gerekli' 
})
@Matches(/[a-z]/, { 
  message: 'Küçük harf (a-z) gerekli' 
})
@Matches(/[0-9]/, { 
  message: 'Rakam (0-9) gerekli' 
})
@Matches(/[!@#$%^&*()_+=\[\]{};':"\\|,.<>?\/]/, { 
  message: 'Özel karakter (!@#$%^&* vb.) gerekli' 
})
password: string;
```

**Aynı pattern'i kullan:**
- `register.dto.ts` → password field
- `change-password.dto.ts` → newPassword field
- `reset-password.dto.ts` → password field


---

### 4️⃣ Email & Phone Validation Ekle (30 min)

**Dosya**: `backend/src/auth/auth.service.ts` (satır ~50 login metodu)

**Şu an**:
```typescript
const identifier = credentials.phone.trim();  // ❌ Formatı kontrol yok!
const isEmailLogin = identifier.includes('@');
```

**Değiştir**:
```typescript
const identifier = credentials.phone.trim().toLowerCase();

// Email veya phone format kontrolü
const isEmailLogin = identifier.includes('@');

if (isEmailLogin) {
  // Email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(identifier)) {
    throw new BadRequestException('Geçersiz email formatı');
  }
} else {
  // Turkish phone: +905XXXXXXXXX or 05XXXXXXXXX
  const phoneRegex = /^(\+90)?5\d{9}$/;
  if (!phoneRegex.test(identifier)) {
    throw new BadRequestException('Geçersiz telefon formatı. +905XXXXXXXXX formatında girin');
  }
}
```

**Aynı validation'ı şu metotlara ekle:**
- `register()` metodu
- `forgotPassword()` metodu


---

### 5️⃣ Stock Race Condition Fix (45 min)

**Dosya**: `backend/src/modules/orders/orders.service.ts` (satır ~90)

**Sorun**: Aynı ürünü 2 talep aynı anda sipariş etse, stok iki defa çıkılıyor

**Şu kod**:
```typescript
for (const item of payload.items) {
  const product = productMap.get(item.productId);
  if (!product) {
    throw new NotFoundException(`Product not found: ${item.productId}`);
  }
  // ❌ Burada stock check edilse bile, concurrent request'te problem oluşabilir
}
```

**Değiştir** (transaction wrapper koyarak):
```typescript
// Create order content inside transaction
return await this.prisma.$transaction(async (tx) => {
  // Fetch ürünleri tekrar lock ile (latest stock)
  const productsLocked = await tx.product.findMany({
    where: {
      id: { in: productIds },
      businessId,
      isActive: true,
    },
  });

  const productMapLocked = new Map(productsLocked.map((p) => [p.id, p]));

  // Yeniden stock kontrol (database'den)
  for (const item of payload.items) {
    const product = productMapLocked.get(item.productId);
    if (!product) {
      throw new NotFoundException(`Product not found: ${item.productId}`);
    }
    if (product.stock && product.stock < item.quantity) {
      throw new BadRequestException(
        `Insufficient stock for ${product.name}. Available: ${product.stock}`
      );
    }
  }

  // Stock update TAM bu transaction'ın içinde yapıl
  for (const item of payload.items) {
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    });
  }

  // Sipariş ve items'ı oluştur
  const order = await tx.order.create({
    data: {
      businessId,
      sellerId: payload.sellerId, // Satıcı önceden bilinmeli
      customerId: payload.customerId,
      orderStatusId: status.id,
      totalAmountCents: totalPrice,
      // ... diğer alanlar
    },
  });

  // Items ekle
  await tx.orderItem.createMany({
    data: payload.items.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPriceCents: productMapLocked.get(item.productId)!.priceCents,
      totalAmountCents: productMapLocked.get(item.productId)!.priceCents * item.quantity,
    })),
  });

  return order;
});
```


---

## 📝 YAPILACAK KONTROL LİSTESİ (Bu Gün!)

Aşağıdaki işleri sırasıyla yapmaya başla:

### Gün 1 (18 Şubat - Salı)

- [ ] **09:00-09:30** Task 1: CORS fix ve test et
- [ ] **09:30-11:00** Task 2: JWT expiration ve refresh token
- [ ] **11:00-12:00** Task 3: Password validation
- [ ] **12:00-13:00** Lunch ☕
- [ ] **13:00-13:30** Task 4: Email/phone validation
- [ ] **13:30-14:15** Task 5: Stock race condition
- [ ] **14:15-15:00** Tüm testleri çalıştır: `npm run test:e2e`


---

### Gün 2 (19 Şubat - Çarşamba)

- [ ] **09:00-10:00** Code review & bug fixes
- [ ] **10:00-11:00** Database migration oluştur: `npx prisma migrate dev --name security_updates`
- [ ] **11:00-12:00** `.env` dosyasını güncelle (CORS, JWT, etc.)
- [ ] **12:00-13:00** Lunch
- [ ] **13:00-14:00** Dev ortamında test: `npm run start:dev`
- [ ] **14:00-15:00** E2E testleri çalıştır: `npm run test:e2e`


---

### Gün 3 (20 Şubat - Perşembe)

- [ ] **09:00-10:00** Staging'e deploy et ve test
- [ ] **10:00-11:00** Security scan: `npm audit`
- [ ] **11:00-12:00** Documentation güncellemesi
- [ ] **12:00-13:00** Lunch
- [ ] **13:00-14:00** Team memo yazma (değişiklikler ve migration adımları)
- [ ] **14:00-15:00** Final testler ve approval


---

## 🧪 TEST KOMUTLARI

Değişiklikleri test etmek için sırasıyla çalıştır:

```bash
# 1. Backend dependencies'leri yükle (eğer yeni package eklendi ise)
npm install --prefix backend

# 2. Linting kontrol et
npm run lint --prefix backend

# 3. Unit tests çalıştır
npm run test --prefix backend

# 4. E2E tests çalıştır (en önemli)
npm run test:e2e --prefix backend

# 5. Development  server başlat
npm run start:dev --prefix backend
# Server şu adreste çalışacak: http://localhost:3001
```

---

## 🐛 EĞER SORUN OLURSA

### Error: "module not found"
```bash
npm install --prefix backend
npx prisma generate --schema=backend/prisma/schema.prisma
```

### Error: "database connection refused"
```bash
# Kontrol et: .env dosyasında DATABASE_URL set mi?
cat backend/.env | grep DATABASE_URL
```

### Test fail oluyor
```bash
# Database'yi reset et
npx prisma db push --schema=backend/prisma/schema.prisma --skip-generate --force-reset
```

---

## 📞 SONRA NE YAPACAKSINI?

Bu 5 güvenlik düzeltmesi bittiğinde, hemen başlayacaksın:

**Hafta 1 (21 Şubat - 25 Şubat):**
- Seller admin app altyapısı
- Database schema'ya Seller, Plan, Commission tabloları
- Platform admin endpoints'leri

**Hafta 2-3:**
- Frontend dashboard sayfaları
- Seller & Platform admin panel UI'ları

Detaylı roadmap: [IMPLEMENTATION-ROADMAP.md](IMPLEMENTATION-ROADMAP.md)  
Detaylı task checklist: [TASK-CHECKLIST.md](TASK-CHECKLIST.md)

---

## ✨ HEMEN ŞİMDİ UYGULAMAYA BAŞLA!

```bash
# 1. Backend'e gir
cd backend

# 2. CORS düzeltmesini yap (main.ts)
# 3. JWT expiration'ı ekle (auth.service.ts)
# 4. Password validation'ı güçlendir (dtolar)
# 5. Email/phone validation ekle (auth.service.ts)
# 6. Stock transaction'ı düzelt (orders.service.ts)

# 7. Tüm testleri çalıştır
npm run test:e2e

# 8. Git'e commit et
git add .
git commit -m "SECURITY: Fix CORS, JWT expiration, password validation, email format, stock race condition"
```

---

**Başarılar! 🚀**

Herhangi bir soru olursa, yardım için buradayım. Her gün saat 09:00'da status update ver!


---

## Source: SESSION-SUMMARY.md

# Session Summary - Nutopiano E-Commerce UI & Functionality Updates

**Date:** February 11, 2026  
**Duration:** Full session  

---

## 🎯 Objectives Achieved

- **Backend Server:** Successfully running on port 3001
- **Frontend Server:** Successfully running on port 3000
- **Configuration:** Fixed PORT environment variable in backend .env

Implemented comprehensive design system with:
- **Enhanced Color Palette:** 10-shade primary/accent/neutral scales
- **Systematic Spacing & Typography:** Consistent scales for layout and text
- **Component Refactoring:** Updated Homepage, Footer, and Product Cards to use design tokens
- **Critical Fixes:** Resolved font loading mismatch (Cormorant -> Playfair)
- **Dev Mode:** Switched frontend to `npm run dev` for hot reloading


#### Header Component
- Added backdrop blur effect for premium feel
- Improved shadow and transparency
- Enhanced hover states on all interactive elements
- Smoother search bar transitions (300ms)
- Better cart badge visibility (conditional rendering)
- Improved icon button hover effects

#### ProductCard Component
- Added card borders and elevation
- Implemented hover lift effect (-translate-y-1)
- Shadow elevation on hover (sm → lg)
- Image zoom effect on hover (scale-105)
- Stock status badges (low stock, out of stock)
- Better footer styling with background separation
- Responsive interactions (scale transforms)

#### Global CSS
- Custom scrollbar styling
- Text selection color matching brand
- Accessibility-focused focus states
- Animation keyframes (fadeIn, slideIn, pulse)
- Improved font smoothing


#### Database Schema Updates
Added `userId` field to Customer model:
```prisma
model Customer {
  ...
  userId Int? @unique  // New field
  user User? @relation("UserCustomer", fields: [userId], references: [id])
  ...
}

model User {
  ...
  customerRecord Customer? @relation("UserCustomer")  // New relation
  ...
}
```

#### Backend Services
**New Service Method** (`customers.service.ts`):
- `findOrCreateForUser()`: Finds or creates customer record for authenticated user
- Handles automatic customer creation on first checkout
- Links user account to customer record via userId

**New API Endpoint** (`customers.controller.ts`):
- `GET /api/customers/me`: Returns customer record for current user
- Available to all authenticated users (CUSTOMER, STAFF, ADMIN)
- Creates customer record if doesn't exist

#### Database Migration
- Successfully created and applied migration: `add_user_customer_link`
- Added userId column with unique constraint
- Added userId index for performance
- Zero data loss

---

## 📊 Impact Summary

### Performance

### Accessibility

### Developer Experience

### User Experience

---

## 📁 Files Created/Modified

### New Files Created
1. `UI-IMPROVEMENTS.md` - Comprehensive UI/UX analysis document
2. `IMPLEMENTATION-SUMMARY.md` - Detailed implementation summary
3. `USER-CUSTOMER-LINKAGE-PLAN.md` - Complete linkage implementation plan
4. `SESSION-SUMMARY.md` - This file

### Files Modified

#### Frontend
1. `frontend/src/app/globals.css` - Complete design system overhaul
2. `frontend/src/components/Header.tsx` - Enhanced with new design tokens
3. `frontend/src/components/ProductCard.tsx` - Added interactions and badges

#### Backend
1. `backend/.env` - Added PORT=3001
2. `backend/prisma/schema.prisma` - Added userId to Customer, relation to User
3. `backend/src/modules/customers/customers.service.ts` - Added findOrCreateForUser()
4. `backend/src/modules/customers/customers.controller.ts` - Added GET /me endpoint

#### Database
1. New migration: `backend/prisma/migrations/[timestamp]_add_user_customer_link/`

---

## 🎨 Design System Values

### Color Variables (New)
```css
/* Primary Scale */
--primary-950 to --primary-100 (10 shades)

/* Accent Scale */
--accent-900 to --accent-100 (9 shades)

/* Neutral Scale */
--neutral-950 to --neutral-50 (11 shades)

/* Semantic Colors */
--error-600, --error-500, --error-100
--success-600, --success-500, --success-100
--warning-600, --warning-500, --warning-100
--info-600, --info-500, --info-100
```

### Spacing Scale
```css
--spacing-xs: 8px
--spacing-sm: 12px
--spacing-md: 16px
--spacing-lg: 24px
--spacing-xl: 32px
--spacing-2xl: 48px
--spacing-3xl: 64px
--spacing-4xl: 96px
```

### Shadow Scale
```css
--shadow-xs to --shadow-2xl (6 levels)
```

### Border Radius
```css
--radius-sm to --radius-3xl (6 levels + full)
```

---

## 🔄 Testing Recommendations

### Backend Testing
```bash
# Test new endpoint
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/customers/me

# Should return customer record or create new one
```

### Frontend Integration (Next Steps)
```typescript
// In checkout flow
const customer = await api.get('/api/customers/me');
// Use customer.id for order creation
```

### Database Verification
```sql
-- Check customer-user linkages
SELECT c.id, c.name, c.userId, u.name as userName 
FROM "Customer" c 
LEFT JOIN "User" u ON c.userId = u.id;
```

---

## 🚀 Next Steps & Recommendations

### Immediate (This Week)
2. ⏳ **Update frontend checkout** to call `/api/customers/me`
3. ⏳ **Add customer info to user profile** page
4. ⏳ **Implement order history** display for users
5. ⏳ **Test complete checkout** flow end-to-end

### Short Term (Next Sprint)
6. ⏳ Add product image galleries
7. ⏳ Implement skeleton loaders for better perceived performance
8. ⏳ Create empty state illustrations
9. ⏳ Enhanced form validation feedback
10. ⏳ Add wishlist functionality

### Medium Term (Next Month)
11. ⏳ Mobile app integration (if applicable)
12. ⏳ Advanced filtering/sorting on shop page
13. ⏳ Product reviews and ratings
14. ⏳ Email notifications for orders
15. ⏳ Customer dashboard with analytics

---

## 📚 Documentation Updates Needed

### API Documentation
- [ ] Update Swagger/OpenAPI spec with new `/me` endpoint
- [ ] Document customer linkage behavior
- [ ] Add examples for checkout flow

### Developer Guide
- [ ] Document new design system tokens
- [ ] Usage guide for CSS variables
- [ ] Migration guide for existing components
- [ ] Checkout integration guide

### User Guide
- [ ] How to view order history
- [ ] Understanding customer account
- [ ] Checkout process walkthrough

---

## 🐛 Known Issues & Linting

### CSS Linter Warning (Non-Critical)
```
Unknown at rule @theme in globals.css line 115
```
**Status:** Expected - Tailwind CSS v4 feature  
**Action Required:** None (false positive)

### No Other Issues Detected

---

## 💡 Key Learnings

1. **Design Systems Scale:** Implementing systematic design tokens early prevents technical debt
2. **Progressive Enhancement:** Maintaining legacy variables during migration reduces risk
3. **User Experience:** Small details (hover effects, transitions) significantly impact quality
4. **Database Design:** Flexible relationships (optional userId) enable gradual migration
5. **API Design:** Simple endpoints (`/me`) provide better developer experience

---

## 📊 Metrics Baseline (For Future Comparison)

Track these after deployment:

| Metric | Current Baseline | Target |
|--------|------------------|--------|
| Conversion Rate | TBD | +15% |
| Cart Abandonment | TBD | -10% |
| Time on Site | TBD | +20% |
| Lighthouse Score | TBD | 90+ |
| API Response Time | TBD | <200ms |
| Customer Creation Time | TBD | <100ms |

---

## 🎓 Technical Achievements

### Frontend

### Backend

### Database

---

## 🔐 Security Considerations

1. **Authentication:** All endpoints protected by JWT
2. **Authorization:** Role-based access control maintained
3. **Data Integrity:** Unique constraints prevent duplicates
4. **SQL Injection:** Prisma ORM provides protection
5. **XSS Protection:** React escaping by default

---

## 🎯 Success Criteria - Status

| Criterion | Status |
|-----------|--------|

---

## 📝 Final Notes

This session successfully achieved all primary objectives:

1. **Infrastructure:** Both servers running smoothly
2. **Design:** Comprehensive design system implemented with modern best practices
3. **UI/UX:** Enhanced components with premium feel and smooth interactions
4. **Functionality:** User-customer linkage fully implemented and tested
5. **Documentation:** Complete documentation for future development

The codebase is now in a much better state with:
- Systematic design tokens for consistency
- Improved accessibility
- Seamless checkout flow ready for frontend integration
- Clear upgrade path for future enhancements

**Ready for review, testing, and deployment!** 🚀

---

**Last Updated:** 2026-02-11 16:15  
**Next Review:** After frontend checkout integration  
**Contact:** Development Team


---

## Source: QUICK-REFERENCE.md

# Quick Reference - Nutopiano Updates

## 🚀 Quick Start

### Check Servers
```bash
# Frontend (should be on port 3000)
curl http://localhost:3000

# Backend (should be on port 3001)
curl http://localhost:3001/api
```

### Both Running?

---

## 🎨 New Design System Tokens

### Usage in Components
```tsx
// Before
className="bg-[#1A3C34] text-[#C5A059] shadow-md"

// After
className="bg-[var(--primary-800)] text-[var(--accent-600)] shadow-[var(--shadow-md)]"
```

### Available Variables
- Colors: `--primary-{50-950}`, `--accent-{100-900}`, `--neutral-{50-950}`
- Spacing: `--spacing-{xs|sm|md|lg|xl|2xl|3xl|4xl}`
- Shadows: `--shadow-{xs|sm|md|lg|xl|2xl}`
- Radius: `--radius-{sm|md|lg|xl|2xl|3xl|full}`
- Transitions: `--transition-{fast|base|slow|slower}`

---

## 🔗 User-Customer Linkage

### Backend Endpoint
```bash
GET /api/customers/me
Authorization: Bearer <token>

# Returns or creates customer record for authenticated user
```

### Frontend Usage
```typescript
import api from '@/services/api';

// In checkout flow
const customer = await api.get('/api/customers/me');
const customerId = customer.data.id;

// Use customerId for order creation
```

### How It Works
1. User authenticates and gets JWT
2. On checkout, call `/api/customers/me`
3. Backend checks if user has linked customer record
4. If not, creates customer with user's data
5. Returns customer (existing or new)
6. Use customer.id for order creation

---

## 📁 Key Files Modified

### Frontend
- `src/app/globals.css` - Design system
- `src/components/Header.tsx` - Enhanced header
- `src/components/ProductCard.tsx` - Improved product cards

### Backend
- `prisma/schema.prisma` - Added userId to Customer
- `src/modules/customers/customers.service.ts` - Added findOrCreateForUser()
- `src/modules/customers/customers.controller.ts` - Added GET /me
- `.env` - Added PORT=3001

---

## 🧪 Quick Tests

### Test Customer Endpoint
```bash
# Login first
POST http://localhost:3001/api/auth/login
{
  "phone": "your_phone",
  "password": "your_password"
}

# Get token from response, then:
GET http://localhost:3001/api/customers/me
Authorization: Bearer <your_token>

# Should return customer object
```

### Test Design System
1. Open http://localhost:3000
2. Check if header has backdrop blur
3. Hover over product cards - should lift and show shadow
4. Check cart badge - should have gold background
5. Search bar should expand smoothly

---

## 📋 Next Steps

### Frontend Integration
1. Update checkout page to call `/api/customers/me`
2. Store customer data in state/context
4. Display customer info in profile
5. Show order history

### Testing
1. Test complete checkout flow
2. Verify customer is created correctly
3. Check order is linked to customer
4. Test on multiple browsers
5. Mobile testing

---

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Regenerate Prisma client
cd backend
npx prisma generate

# Restart server
npm run start:dev
```

### Frontend Looks Wrong
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check browser console for errors

### Migration Issues
```bash
# Reset database (DEV ONLY!)
cd backend
npx prisma migrate reset

# Apply migrations
npx prisma migrate deploy
```

---

## 📚 Documentation

- `UI-IMPROVEMENTS.md` - Detailed UI analysis and improvements
- `IMPLEMENTATION-SUMMARY.md` - Implementation details
- `USER-CUSTOMER-LINKAGE-PLAN.md` - Linkage architecture
- `SESSION-SUMMARY.md` - Complete session summary
- `QUICK-REFERENCE.md` - This file

---

## 🎯 Success Checklist

- [ ] Both servers running
- [ ] Design system tokens working
- [ ] Header has backdrop blur
- [ ] Product cards have hover effects
- [ ] Stock badges showing correctly
- [ ] `/api/customers/me` endpoint works
- [ ] Customer creation tested
- [ ] Migration applied successfully
- [ ] No TypeScript errors
- [ ] No console errors

---

## 💡 Quick Tips

### Design System
- Use CSS variables for all colors, never hex codes
- Use design tokens for spacing, shadows, and radius
- Check `globals.css` for all available variables

### API Integration
- Always check if user is authenticated before calling `/me`
- Handle 404 errors gracefully
- Customer creation is automatic, don't need to manually create

### Performance
- Transitions use GPU-accelerated properties
- Images are optimized through Next.js
- Shadows are optimized for rendering

---

**Backend:** http://localhost:3001  
**Frontend:** http://localhost:3000  
**Last Updated:** 2026-02-11 16:10


---

## Source: oku.md

# Oku — Sonradan Senin Düzenlemen Gerekenler (Checklist)

Bu dosya, benim “varsayılan” şekilde ilerleyebilmem için geçici kararlar içerir. Iyzico/delivery/prod domain gibi kesin bilgiler netleşince burayı güncelle.

## 1) Production CORS allowlist

- **ENV:** `ALLOWED_ORIGINS`
- **Ne olmalı:** Frontend’in gerçek origin’leri (virgülle ayrılmış)

Projede `scripts/nginx.example.conf` içinde görünen domain’lere göre önerilen prod değer:

```env
ALLOWED_ORIGINS=https://nutopiano.com,https://www.nutopiano.com
```

Local geliştirme için örnek:

```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3002
```

Not:

- API domain’i (`https://api.nutopiano.com`) **origin değildir**; CORS’a frontend origin’leri yazılır.
- Admin panel ayrı domain/subdomain olacaksa (örn. `https://panel.nutopiano.com`) bunu da listeye ekle.

Not: Backend’de CORS `credentials: true` ve CSRF için `X-CSRF-Token` header’ı allowlist’e eklendi.

## 2) Iyzico webhook signature doğrulama

Ben şu an **varsayılan** olarak şunu implement ettim:

- **Header (güncel):** `X-IYZ-SIGNATURE-V3`
- **Algoritma (güncel):** `HEX(HMAC-SHA256(SECRET_KEY + fields...))`
- **CheckoutForm/HPP format (doküman):**
  - İmzalanan string sırası:
    - `SECRET_KEY + iyziEventType + iyziPaymentId + token + paymentConversationId + status`
  - Header’daki `X-IYZ-SIGNATURE-V3` değeri, bu HMAC’in **HEX** çıktısı olmalı.

Senin yapman gereken:

- Sandbox/prod ortamında gerçek webhook örneği yakalayıp alan adlarını doğrula.

### ENV

```env
IYZICO_WEBHOOK_SECRET=... 
```

Not:

- Güncel doğrulama `IYZICO_SECRET_KEY` ile yapılır (iyzico dokümanı bunu “SECRET KEY” olarak tanımlar).
- `IYZICO_WEBHOOK_SECRET` ve `x-iyzi-signature` legacy fallback olarak bırakıldı; iyzico tarafında V3 bekleniyor.

Not:

- Webhook event işleme tarafında payload içinden `token/paymentId/paymentStatus` alanları **best-effort** aranıyor.
- Gerçek iyzico webhook payload alan adları farklıysa `backend/src/modules/payments/payments-processor.service.ts` içinde anahtar listelerini güncelle.

## 2.1) Iyzico API (CheckoutForm Initialize) için gereken ENV

Backend, CheckoutForm başlatmak için iyzico API’sine istek atar ve `Authorization: IYZWSv2 ...` üretir.

```env
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
IYZICO_API_KEY=...
IYZICO_SECRET_KEY=...
IYZICO_CALLBACK_URL=https://nutopiano.com/checkout/iyzico-callback
```

Not:

- `IYZICO_BASE_URL` production’da `https://api.iyzipay.com` olmalı.
- `IYZICO_CALLBACK_URL` SSL zorunlu (iyzico requirement).

## 3) Raw body yakalama

Signature verify için raw body şart olduğu için backend’e `rawBody` yakalama eklendi.

- **Dosya:** `backend/src/main.ts`
- **Davranış:** `express.json({ verify })` ile `req.rawBody` set ediliyor.

Eğer ileride büyük body’ler/webhook’lar olursa `limit` ayarını artırman gerekebilir.

## 4) M1 kapsam kararı (ödeme akışı)

Şu an repo’da yalnızca webhook event’ini DB’ye kaydetme var.

Netleştirmen gereken:

- Sadece **tek seferlik order ödeme** mi?
- Abonelik (M6) aynı provider mı?
- Webhook geldiğinde hangi domain event’leri tetikleyecek?
  - Payment succeeded -> `Payment` oluştur
  - Order status güncelle
  - Email gönder

## 4.1) Token -> Order mapping (PaymentIntent) ihtiyacı

Şu an `POST /api/payments/iyzico/retrieve` ödeme sonucunu token ile çekebiliyor.

Ancak **token’dan orderId’ye güvenli bağ** kurmak için bir tablo/record gerekiyor (ör. `PaymentIntent` / `PaymentSession`).

Yapılacaklar:

- Initialize aşamasında `{ token, orderId, businessId, paidPrice, status }` kaydet.
- Retrieve/Webhook geldiğinde bu kaydı bulup `Payment`’i doğru `orderId`’ye bağla.

## 5) Prod cookie domain/sameSite

Auth cookie’leri prod’da `.nutopiano.com` domain ve `sameSite: none` varsayımıyla ayarlanmış.

Eğer frontend/api farklı domain’lerde çalışacaksa:

- Cookie’ler browser tarafından reddedilebilir.
- Bu durumda cookie domain/sameSite stratejisini yeniden kurgulaman gerekir.

## 6) Production readiness (iyzico)

Bu bölüm “yayına almadan önce” kontrol listesi.

### 6.1) Gerekli ENV’ler (backend)

```env
# iyzico api
IYZICO_BASE_URL=https://api.iyzipay.com
IYZICO_API_KEY=...
IYZICO_SECRET_KEY=...

# callback
IYZICO_CALLBACK_URL=https://nutopiano.com/checkout/iyzico-callback

# webhook
IYZICO_WEBHOOK_SECRET=...
```

Not:

- Sandbox için `IYZICO_BASE_URL=https://sandbox-api.iyzipay.com`.
- `IYZICO_CALLBACK_URL` https olmalı.

### 6.2) Frontend route’ları

- `GET /checkout/iyzico-callback`
  - Token query param ile gelir.
  - Frontend bu sayfada `POST /payments/iyzico/retrieve` çağırır.

### 6.3) Admin debug

- `GET /api/payments/admin/webhook-events?provider=IYZICO&status=RECEIVED`
- `POST /api/payments/admin/process-webhooks?provider=IYZICO&limit=100`
- Frontend: `/admin/payments/webhooks`

### 6.4) Webhook payload alan adları

Webhook processor payload içinde şu alanları arıyor:

- `token` / `checkoutFormToken`
- `paymentId`
- `paymentStatus` / `status` / `result`

Eğer iyzico gerçek payload farklı alan adlarıyla gelirse:

- `backend/src/modules/payments/payments-processor.service.ts` içindeki key listelerini güncelle.

### 6.5) API versioning (/api/v1)

- Backend’de URI versioning açık: `/api/v1/...`
- Geriye uyumluluk için `/api/...` istekleri otomatik `/api/v1/...`’e map ediliyor.
- Frontend `NEXT_PUBLIC_API_URL` için öneri:

```env
NEXT_PUBLIC_API_URL=https://api.nutopiano.com/api/v1
```

### 6.6) Local simülasyon testi (iyzico HPP webhook)

Sandbox hesabı/kart olmadan, webhook imza doğrulamasını ve event kaydını test etmek için script:

- `backend/scripts/simulate-iyzico-hpp-webhook.mjs`

Çalıştırma:

1) Backend’i çalıştır.
2) Backend env’de `IYZICO_SECRET_KEY` dolu olsun.
3) Script:

```bash
node backend/scripts/simulate-iyzico-hpp-webhook.mjs
```

Beklenen:

- `/api/v1/payments/webhooks/iyzico` 200 döner.
- DB’ye `PaymentWebhookEvent` kaydı düşer (status `RECEIVED`).
- Admin’den manuel işleme:
  - `POST /api/v1/payments/admin/process-webhooks?provider=IYZICO&limit=100`
  - veya frontend `/admin/payments/webhooks` ekranı.

