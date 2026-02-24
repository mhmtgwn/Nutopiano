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

- [x] A1 - Public seller vitrin route uyumu: `/magaza/{sellerSlug}` canonical + link + pagination + alias
- [x] A2 - Rol izolasyon smoke paketi: `SELLER/USER/CUSTOMER/ADMIN/SUPER_ADMIN` panel + endpoint matrix kontrolu
- [x] A3 - Plan dosyasi + README senkronu: tamamlanan maddeler ve acik MVP-sonrasi kalemlerin net ayrimi

Tamamlanma kriteri:
- Frontend build gecer
- Backend build gecer
- E2E ana paket gecer

### B. Admin Controlled Override + Audit (Kilit Karar 1)

- [x] B1 - `AuditLog` modeli ve migration (actorRole, actorUserId, actionType, targetType, targetId, payloadJson, createdAt)
- [x] B2 - Kritik aksiyon tanimi: `publish-force`, `stock-adjust-force`, `role-change`
- [x] B3 - ADMIN icin varsayilan read-only kurali (kritik yazma aksiyonlari normal endpointten engellenecek)
- [x] B4 - Kontrollu override endpointleri (zorunlu reason + audit log insert)
- [x] B5 - SUPER_ADMIN icin tam yetki, fakat audit yine yazilacak
- [x] B6 - E2E: admin normalde 403, override ile 2xx + audit kaydi olusur

Tamamlanma kriteri:
- Kritik endpointlerde ADMIN davranisi planla birebir uyumlu olur
- Audit kaydi olmayan kritik aksiyon kalmaz
- E2E green

### C. Seller Invite Delivery Orkestrasyonu (MVP Sonrasi 1)

- [x] C1 - Invite delivery domain modeli (delivery status, kanal, retry)
- [x] C2 - Email/SMS gonderim adapter katmani (env driven)
- [x] C3 - Invite create aninda async delivery tetikleme (ilk adim: queue/job)
- [x] C4 - Retry + dead-letter davranisi
- [x] C5 - Admin/seller gorunumunde delivery durumu
- [x] C6 - E2E: invite olusur, delivery kaydi olusur, hata senaryosu retry edilir

Tamamlanma kriteri:
- Invite delivery sureci gozlemlenebilir ve retry edilebilir olur

### D. Gelismis Analitik + Komisyon/Maliyet Dagitimi (MVP Sonrasi 2)

- [x] D1 - Finans hesap motoru genisletme: kargo/komisyon/iade maliyet dagitimi
- [x] D2 - Gerekli snapshot alanlari ve migrationlar
- [x] D3 - Finance endpointlerine yeni metrikler (net profit v2, allocation-aware)
- [x] D4 - Dashboard kartlari ve rapor tablolari guncelleme
- [x] D5 - E2E + hesaplama fixturelari

Tamamlanma kriteri:
- Raporlar allocation-aware net kar uretebilir
- Eski raporlarla geriye donuk kirilim olmadan calisir

### E. Outbox Aktivasyonu (MVP-2 Hazirlik)

- [x] E1 - Kritik event producerlari (siparis, odeme, publish, invite)
- [x] E2 - Outbox poller/worker
- [x] E3 - Idempotency + poison/dead-letter stratejisi
- [x] E4 - Monitoring metricleri (processed, failed, retry)
- [x] E5 - E2E/integration testleri

Tamamlanma kriteri:
- Outbox tablosu pasif durumdan aktif event pipeline durumuna gecer

### F. UAT ve Canliya Alim

- [x] F1 - UAT senaryo listesi (seller/user/customer izolasyonu, finance dogrulama)
- [x] F2 - Staging dogrulama raporu
- [x] F3 - Release checklist + rollback plani
- [x] F4 - Son toplu regresyon (`backend e2e`, `backend build`, `frontend build`)

Tamamlanma kriteri:
- Tum backlog maddeleri kapanir
- Son test/build seti yesil olur
- Kalan acik madde sadece bilerek ertelenen teknik borclar olur

## 12) Calisma Protokolu (Bundan Sonra)

- Sira: A -> B -> C -> D -> E -> F
- Her gorev sonunda ilgili testler kosulur, faz sonlarinda tam regresyon kosulur
- Bloke olmayan hicbir noktada kullanicidan "devam" beklenmez
- Sadece urun/karar belirsizligi olursa tek net soru sorulur
