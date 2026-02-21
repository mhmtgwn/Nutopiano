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

