# Nutopiano — Detaylı Teknik Kılavuz (Monorepo)

Bu doküman, `Nutopiano/` repo’sunun **tam resmini** verir:

- Kod yapısı (backend + frontend)
- Yerel kurulum, environment değişkenleri
- Authentication (JWT + cookie), RBAC (roller)
- Multi-tenant (`businessId`) yaklaşımı
- POS + Offline çalışma modeli (Service Worker + IndexedDB queue)
- Deploy (PM2) ve troubleshooting

> Not: Repo zaten çok sayıda teknik doküman içeriyor (`README.md`, `4.7.md`, plan/checklist’ler). Bu kılavuz, **tek bir ana referans** olsun diye “uçtan uca” toparlar.

---

## 0) Repo Haritası

Repo bir **npm workspaces** monorepo:

- `backend/` — NestJS API (PostgreSQL + Prisma)
- `frontend/` — Next.js App Router (Storefront + Panel + POS)
- `scripts/` — deploy/backup/loadtest vb.
- `ecosystem*.cjs` — PM2 prod/staging process tanımları
- `docker-compose.yml` — opsiyonel docker stack

Root `package.json`:

- `npm run dev:backend`
- `npm run dev:frontend`
- `npm run build` (iki workspace’i ardışık build eder)

---

## 1) Çalıştırma Modları

### 1.1 Yerel Development (önerilen)

1) Bağımlılıkları yükle

```bash
npm install
```

2) Backend (varsayılan port: `3001`)

```bash
npm run dev:backend
```

3) Frontend (varsayılan port: `3000`)

```bash
npm run dev:frontend
```

4) Uygulama

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001/api/v1`
- Swagger (prod değilken): `http://localhost:3001/docs`

### 1.2 Production (PM2)

PM2 config:

- `ecosystem.config.cjs` (prod)
- `ecosystem.staging.config.cjs` (staging)

Deploy script:

- `scripts/deploy.sh`

Yaptığı işler:

- `git pull`
- backend: `npm ci` → `prisma generate` → `prisma migrate deploy` → `npm run build`
- frontend: `npm ci` → `.env.local` içine `NEXT_PUBLIC_API_URL` set → `npm run build`
- PM2 restart/reload

---

## 2) Environment Değişkenleri

### 2.1 Backend (`backend/.env`)

Referans: `backend/.env.example`.

Önemli değişkenler:

- `NODE_ENV`
- `PORT` (default: `3001`)
- `DATABASE_URL`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`
- `UPLOADS_DIR` (opsiyonel)
- `REDIS_URL` (throttler storage için)
- `SENTRY_DSN` (opsiyonel)

### 2.2 Frontend (`frontend/.env.local`)

Referans: `frontend/.env.local.example`.

- `NEXT_PUBLIC_API_URL`
  - Dev: `http://localhost:3001/api/v1`
  - Prod: `https://api.nutopiano.com/api/v1`

---

## 3) Backend Mimarisi (NestJS)

### 3.1 Entry Point ve Global Pipeline

**Dosya:** `backend/src/main.ts`

Backend’in request pipeline’ı özetle:

- `validateEnv()` — env doğrulaması
- `app.setGlobalPrefix('api')` + URI versioning (`/api/v1/...`)
- Helmet + cookie-parser
- CSRF middleware (`csrfMiddleware()`)
- Uploads static serve (`/uploads`, `/api/uploads`, `/api/v1/uploads`)
- CORS config + debug header
- Global `ValidationPipe` (DTO whitelist + forbidNonWhitelisted)
- Global interceptors:
  - `HttpMetricsInterceptor`
  - `RequestContextInterceptor`
  - `ResponseInterceptor` (success response wrapper)
- Global filter:
  - `HttpExceptionFilter` (error response wrapper)
- Swagger sadece prod değilken `/docs`

> Önemli: `main.ts` içinde legacy `/api/*` istekleri `/api/v1/*`’e map eden backward-compat middleware var.

### 3.2 AppModule ve Modül Listesi

**Dosya:** `backend/src/app.module.ts`

Kayıtlı modüller:

- `AuthModule`
- `UsersModule`
- `CustomersModule`
- `CategoriesModule`
- `ProductsModule`
- `MarketplaceModule`
- `FinanceModule`
- `SellersModule`
- `OrderStatusModule`
- `SettingsModule`
- `OrdersModule`
- `AppointmentsModule`
- `UploadsModule`
- `PlansModule`
- `DashboardModule`
- `PaymentsModule`
- `PosModule`
- `HealthModule`
- `AuditModule`
- `OutboxModule`

Ayrıca dev-only controller:

- `DevController` (`backend/src/dev/dev.controller.ts`)

### 3.3 Response ve Error Formatı

Backend iki önemli standardizasyon uygular:

- **Başarılı response** (Interceptor):

```json
{ "success": true, "data": <payload>, "message": null }
```

- **Hatalar** (Filter):

```json
{ "success": false, "code": "...", "message": "...", "details": "...", "errors": [...] }
```

Frontend `axios` response interceptor’ı, başarılı response’ları **unwrap** eder (frontend tarafında `response.data` doğrudan payload olur).

### 3.4 Auth: JWT + httpOnly Cookie + Refresh Rotation

**Controller:** `backend/src/auth/auth.controller.ts`

Cookie’ler:

- Access: `nutopiano_access` (~15dk)
- Refresh: `nutopiano_refresh` (~7g)

Endpoint’ler:

- `POST /auth/login` — cookie set
- `POST /auth/refresh` — refresh rotation + cookie set
- `POST /auth/logout` — cookie clear
- `GET /auth/profile` — JWT decode edilen profile

**Service:** `backend/src/auth/auth.service.ts`

Access token payload:

- `userId`
- `phone?`
- `role`
- `businessId`

Refresh token DB’de hashlenmiş şekilde tutulur ve rotate edilir.

### 3.5 RBAC (Role-based Access Control)

Backend’te tipik pattern:

- `JwtAuthGuard` — request’ten JWT’yi çıkarır (cookie veya Bearer), doğrular.
- `@Roles(...)` decorator + `RolesGuard` — endpoint bazlı role kontrol.

> Roller: kodda `SUPER_ADMIN`, `ADMIN`, `SELLER`, `STAFF`, `CUSTOMER` gibi roller kullanılıyor.

### 3.6 Multi-tenant (businessId) ve Request Context

`RequestContextInterceptor` ile request boyunca taşınan alanlar:

- `businessId`
- `userId`
- `role`
- `requestId`

Bu sayede servisler her zaman “hangi işletmenin datası” ile çalıştığını anlayabilir.

---

## 4) Database (Prisma)

**Dosya:** `backend/prisma/schema.prisma`

Ana kavramlar:

- `Business` — tenant kökü
- `User` — auth + role
- `Customer` — CRM profili
- `Product`, `Category`
- `Order`, `OrderItem`, `Payment`
- `CashRegisterSession` (POS vardiya/oturum mantığı)
- `Settings` — business bazlı key-value
- `RefreshToken` — refresh rotation için

Prisma migration’lar `backend/prisma/migrations/` altında.

---

## 5) Frontend Mimarisi (Next.js)

### 5.1 App Router Yapısı

**Kök:** `frontend/src/app/`

Öne çıkan route grupları:

- Storefront: `/`, `/categories`, `/products/[id]`, `/cart`, `/checkout`
- Auth: `/login`, `/register`, `/forgot-password`, `/reset-password`
- Account: `/account/*`
- Panel: `/admin/*`, `/dashboard/*`, `/platform/*`, `/seller/*`
- POS: `/pos`

### 5.2 Middleware ile Route Koruma

**Dosya:** `frontend/src/middleware.ts`

Korunan path’ler (örnek):

- `/account/*`
- `/platform/*`
- `/seller/*`
- `/dashboard/*`
- `/pos/*`

Kontrol:

- `nutopiano_access` cookie var mı?
  - yoksa `/login?next=...`

> Bu kontrol “oturum var mı” seviyesinde. Role bazlı erişim için ayrıca sayfa içinde guard uygulanır.

### 5.3 API İstemcisi (Axios)

**Dosya:** `frontend/src/services/api.ts`

Özellikler:

- `withCredentials: true` (cookie taşır)
- Unsafe request’lerde `X-CSRF-Token` header ekleme (cookie `__csrf`)
- Response unwrap: `{ success:true, data }` → `data`
- `401` gelince otomatik `POST /auth/refresh` ve request retry

### 5.4 Global State (Redux)

**User state:** `frontend/src/store/userSlice.ts`

- `user` (id, phone, role, businessId, ...)
- `status` (`idle|authenticating|authenticated|error`)

**Cart state:** sepetteki ürünler ve toplamlar.

### 5.5 Role routing yardımcıları

**Dosya:** `frontend/src/lib/role-routing.ts`

- `isPosRoleAllowed(role)`
- `getPanelHomePathByRole(role)`
- `getPanelLabelByRole(role)`

Bu dosya, UI’da “hangi rol hangi panel/POS’a gider” kararlarını tek yerde toplamak için var.

---

## 6) POS + Offline Çalışma Modeli

### 6.1 Service Worker (PWA cache)

**Dosya:** `frontend/public/sw.js`

- APP_SHELL cache: `/`, `/pos`, manifest, logo
- Offline navigations:
  - cache varsa döner
  - yoksa `/pos` fallback

### 6.2 Offline Order Queue (IndexedDB)

**Dosya:** `frontend/src/lib/offline/pos-order-queue.ts`

Queue item’ı:

- `id`
- `createdAt`
- `attempts`
- `lastError`
- `payload` (order create isteği)

### 6.3 Sync (Online olunca)

**Dosya:** `frontend/src/app/pos/page.tsx`

- `navigator.onLine` ile online/offline state
- Online olunca queue’daki satışları API’ye gönderir
- `Idempotency-Key` header kullanır

> Backend tarafında idempotency desteği netleştirildiğinde “double submit” riski azalır.

---

## 7) Demo Giriş Anahtarları (4 rol)

**Endpoint:** `GET /dev/seed`

Bu endpoint artık demo kullanıcıları oluşturur/aktif eder.

Şifre (hepsi için): `password123`

- SUPER_ADMIN: `5550000001`
- ADMIN: `5551112233`
- SELLER: `5550000002`
- STAFF: `5550000003`

> Güvenlik: `dev/seed` production’da açık kalmamalı.

---

## 8) Deploy / Operasyon Kılavuzu

### 8.1 PM2

- PM2 app isimleri varsayılan:
  - backend: `nutopiano-api`
  - frontend: `nutopiano-web`

### 8.2 Nginx

Örnek config: `scripts/nginx.example.conf`

- `nutopiano.com` → `127.0.0.1:3000`
- `api.nutopiano.com` → `127.0.0.1:3001`

### 8.3 Backup

`scripts/backup-postgres.sh` ile `pg_dump` + retention.

---

## 9) Troubleshooting

### 9.1 Login oluyor ama sayfa 401

- Cookie domain/samesite/secure ayarlarını kontrol et
- Frontend `NEXT_PUBLIC_API_URL` doğru mu?
- Backend CORS `ALLOWED_ORIGINS` doğru mu?

### 9.2 Next.js prod build crash (client reference manifest)

- `frontend/next.config.ts` içinde turbopack sadece dev’de açık olmalı.

### 9.3 POS offline beklenmedik davranış

- Service worker cache sürümü (`CACHE_NAME`) değişince eski cache temizlenir
- Offline queue içeriği IndexedDB’dedir; tarayıcı temizliği queue’yu sıfırlar

---

## 10) “Ne nerede?” Hızlı Referans

- Backend entry: `backend/src/main.ts`
- Backend modül listesi: `backend/src/app.module.ts`
- Prisma schema: `backend/prisma/schema.prisma`
- Auth controller/service:
  - `backend/src/auth/auth.controller.ts`
  - `backend/src/auth/auth.service.ts`
- Frontend middleware: `frontend/src/middleware.ts`
- Frontend axios client: `frontend/src/services/api.ts`
- POS page: `frontend/src/app/pos/page.tsx`
- Offline queue: `frontend/src/lib/offline/pos-order-queue.ts`
- Service worker: `frontend/public/sw.js`
- Role routing: `frontend/src/lib/role-routing.ts`

---

## 11) Sonraki Adım (İstersen)

Bu kılavuzu “en ince detay” seviyesine daha da indirmek için şunları ekleyebilirim:

- Her backend modülünün endpoint tablosu (method/path/role)
- POS order payload şeması + sync hata politikası
- CashRegisterSession (vardiya) akış diyagramı
- Outbox/Audit modüllerinin ne amaçla kullanıldığı (event logging/sync)

Söyle, hangi bölüme öncelik verelim.
