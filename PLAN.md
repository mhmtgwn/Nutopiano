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
- **Status:** ✅ DONE (transaction with double verification)

---

**5.2. Customer Order Fetch - CUSTOMER Role Fix**
- **Dosya:** [backend/src/modules/orders/orders.service.ts](backend/src/modules/orders/orders.service.ts#L50)
- **Problem:** CUSTOMER sadece kendi siparişlerini görmeli
- **Fix:** Already implemented (findAllPaginated checks customer)
- **Status:** ✅ VERIFY

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

## ✅ BAŞLAMA KONTROL LİSTESİ

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

✅ Do:
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

---

**Son Güncelleme:** 21 Şubat 2026  
**Hazırlayan:** Code Analysis Bot  
**Status:** 🟡 Ready for development
