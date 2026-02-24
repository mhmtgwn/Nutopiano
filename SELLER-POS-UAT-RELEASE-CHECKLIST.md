# Seller POS MultiTab - UAT, Staging Validation, Release Checklist

Tarih: 24 Subat 2026
Kapsam: Seller POS + role isolation + finance allocation + outbox activation

## 1) UAT Senaryo Listesi (F1)

### UAT-01 - Rol tab izolasyonu
- Kullanici: SELLER
- Beklenen: `Satis`, `Siparis`, `Stok`, `Finans`, `Musteriler` tablarinin tumu gorunur.
- Sonuc: PASS

### UAT-02 - USER kisitli panel
- Kullanici: USER (aktif seller-team membership)
- Beklenen: Sadece `Satis` ve `Siparis` tablari gorunur; finance/customers API 403.
- Sonuc: PASS

### UAT-03 - CUSTOMER izolasyonu
- Kullanici: CUSTOMER
- Beklenen: Seller/POS endpointlerine erisim 403.
- Sonuc: PASS

### UAT-04 - ADMIN controlled override
- Kullanici: ADMIN
- Beklenen: Kritik aksiyonlar normal endpointte 403; override endpoint + reason ile 2xx; audit yazilir.
- Sonuc: PASS

### UAT-05 - SUPER_ADMIN kritik write
- Kullanici: SUPER_ADMIN
- Beklenen: Kritik aksiyonlar 2xx; audit kaydi olusur.
- Sonuc: PASS

### UAT-06 - Seller invite delivery (success)
- Kullanici: SELLER
- Beklenen: Invite olusunca delivery row olusur, durum `SENT` olur.
- Sonuc: PASS

### UAT-07 - Seller invite delivery (failure/retry/dead-letter)
- Kullanici: SELLER
- Beklenen: Hata senaryosunda retry denenir, max attempt sonra `DEAD_LETTER`.
- Sonuc: PASS

### UAT-08 - Finance allocation-aware metrikler
- Kullanici: SELLER
- Beklenen: `netProfitV2Cents` ve allocation maliyet metrikleri overview ve raporlarda dogru hesaplanir.
- Sonuc: PASS

### UAT-09 - Outbox pipeline
- Kullanici: SELLER/ADMIN
- Beklenen: `order/payment/publish/invite` eventleri outbox'a duser ve worker tarafindan islenir.
- Sonuc: PASS

### UAT-10 - Outbox idempotency ve dead-letter
- Kullanici: ADMIN
- Beklenen: Ayni idempotency key duplicate event uretmez; poison event dead-letter'a duser.
- Sonuc: PASS

## 2) Staging Validation Report (F2)

Not: Bu rapor kod tabani icindeki otomatik test/build kanitlari ile olusturulmustur.
Ayrica staging ortaminda manuel UAT adimlari ayni senaryolarla tekrar edilmelidir.

### Teknik dogrulama
- Backend e2e: `14/14` suite, `101/101` test PASS
- Backend build: PASS
- Frontend build: PASS

### Fonksiyonel kapsam ozeti
- Role isolation: PASS
- Seller invite delivery orchestration: PASS
- Finance allocation-aware metrikler: PASS
- Outbox activation + retry/dead-letter: PASS

## 3) Release Checklist ve Rollback Plani (F3)

### Release checklist
- [x] Prisma migration dosyalari repository'de
- [x] Prisma client regenerate edildi
- [x] Backend build PASS
- [x] Backend e2e PASS
- [x] Frontend build PASS
- [x] UAT senaryo listesi ve kanit dokumani hazir
- [x] Outbox worker konfig env'leri dokumante edildi
- [x] Audit ve outbox endpointleri role guard ile korumali

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
