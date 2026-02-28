# 📘 NUTOPIANO - KAPSAMLI TEKNİK DOKÜMANTASYON

**Tarih:** 21 Şubat 2026  
**Sürüm:** 1.0.0-beta  
**Durum:** Production Hazırlığı Devam Ediyor

---

## 🎯 QUİCK START

```bash
# 1. Tüm bağımlılıkları kur
npm install

# 2. Backend başlat (port 3001)
npm run dev:backend

# 3. Frontend başlat (port 3000)
npm run dev:frontend

# 4. Tarayıcıda aç
open http://localhost:3000
```

Staging deployment notes: `STAGING.md`
Deploy secrets checklist: `DEPLOY-SECRETS.md`
Backup/restore notes: `BACKUP.md`
Dependency security gate: `.github/workflows/security-audit.yml` (`npm run security:audit`)
CI workflow: `.github/workflows/ci.yml`
Deploy workflow: `.github/workflows/deploy.yml` (main -> staging, production via environment approval)
Docker quick start: `DOCKER.md`
Load testing quick start: `LOADTEST.md` (`npm run loadtest:k6`)
Monitoring quick start: `MONITORING.md`
Managed PostgreSQL migration: `MANAGED-POSTGRES.md`
Cloudflare CDN cutover: `CLOUDFLARE.md`

---

## 📊 PROJECT OVERVIEW

Nutopiano, **Türk pazarı için multi-tenant SaaS e-ticaret platformu**. İşletmeler (güzellik, moda, hizmet) online satış yapabilir.

### İçeriği

- **Backend:** NestJS + PostgreSQL + Prisma ORM
- **Frontend:** Next.js 16 + React 19 + Redux Toolkit
- **Database:** PostgreSQL 14+
- **Auth:** JWT + Passport + RBAC
- **Payments:** iyzico + PayTR (hazırlanıyor)

### Kullanıcı Rolleri

```
ADMIN      → İşletme sahibi (tüm erişim)
USER       → Satış personeli (seller team izinlerine bağlı)
CUSTOMER   → Normal müşteri (readonly profile)
SELLER     → Satıcı (commission-based)
```

Not (24 Subat 2026): Rol modelinde `STAFF` kaldirildi, aktif teknik rol `USER` olarak kullanilmaktadir.
Seller vitrini route'u `/magaza/{sellerSlug}` seklindedir.

---

## 🏗️ PROJECT STRUCTURE

```
nutopiano/
├── backend/                          # NestJS server
│   ├── src/
│   │   ├── main.ts                  # App entry point
│   │   ├── app.module.ts            # Root module
│   │   ├── app.controller.ts        # Root endpoints
│   │   ├── app.service.ts           # Root logic
│   │   │
│   │   ├── auth/                    # 🔐 Kim. Doğrulama
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── strategies/          # Passport strategies
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   ├── register.dto.ts
│   │   │   │   ├── forgot-password.dto.ts
│   │   │   │   ├── reset-password.dto.ts
│   │   │   │   ├── update-profile.dto.ts
│   │   │   │   └── change-password.dto.ts
│   │   │   └── types/
│   │   │       └── jwt-payload.ts
│   │   │
│   │   ├── common/
│   │   │   ├── decorators/          # @Roles(), @Public()
│   │   │   ├── guards/              # JwtAuthGuard, RolesGuard
│   │   │   ├── utils/               # Pagination, formatting
│   │   │   └── middleware/          # CORS, logging, etc.
│   │   │
│   │   ├── core/                    # Alias: common/ (backwards compat)
│   │   │   ├── guards/
│   │   │   └── decorators/
│   │   │
│   │   ├── database/                # 🗄️ Veritabanı
│   │   │   ├── prisma.service.ts    # Prisma client wrapper
│   │   │   └── database.module.ts
│   │   │
│   │   ├── email/                   # 📧 Email servisi
│   │   │   ├── email.service.ts     # Nodemailer wrapper
│   │   │   └── email.module.ts
│   │   │
│   │   ├── modules/                 # 🧩 İş modülleri
│   │   │   ├── users/               # Kullanıcı yönetimi
│   │   │   │   ├── users.service.ts
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── dto/
│   │   │   │   └── users.module.ts
│   │   │   │
│   │   │   ├── customers/           # 👥 Müşteri CRM
│   │   │   │   ├── customers.service.ts (884 satır)
│   │   │   │   ├── customers.controller.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── create-customer.dto.ts
│   │   │   │   │   └── update-customer.dto.ts
│   │   │   │   └── customers.module.ts
│   │   │   │
│   │   │   ├── products/            # 📦 Ürün yönetimi
│   │   │   │   ├── products.service.ts (602 satır)
│   │   │   │   ├── products.controller.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── create-product.dto.ts
│   │   │   │   │   └── update-product.dto.ts
│   │   │   │   └── products.module.ts
│   │   │   │
│   │   │   ├── categories/          # 📂 Kategori yönetimi
│   │   │   │   ├── categories.service.ts
│   │   │   │   ├── categories.controller.ts
│   │   │   │   └── categories.module.ts
│   │   │   │
│   │   │   ├── orders/              # 📋 Sipariş yönetimi
│   │   │   │   ├── orders.service.ts (806 satır)
│   │   │   │   ├── orders.controller.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── create-order.dto.ts
│   │   │   │   │   ├── update-order.dto.ts
│   │   │   │   │   └── create-payment.dto.ts
│   │   │   │   └── orders.module.ts
│   │   │   │
│   │   │   ├── appointments/        # 📅 Randevu yönetimi
│   │   │   │   ├── appointments.service.ts
│   │   │   │   ├── appointments.controller.ts
│   │   │   │   └── appointments.module.ts
│   │   │   │
│   │   │   ├── finance/             # 💰 Finansal işlemler
│   │   │   │   ├── finance.service.ts (293 satır)
│   │   │   │   ├── finance.controller.ts
│   │   │   │   └── finance.module.ts
│   │   │   │
│   │   │   ├── uploads/             # 📤 Dosya yükleme
│   │   │   │   ├── uploads.service.ts
│   │   │   │   ├── uploads.controller.ts
│   │   │   │   └── uploads.module.ts
│   │   │   │
│   │   │   ├── settings/            # ⚙️ İşletme ayarları
│   │   │   │   ├── settings.service.ts
│   │   │   │   ├── settings.controller.ts
│   │   │   │   └── settings.module.ts
│   │   │   │
│   │   │   ├── order-status/        # Sipariş durum yönetimi
│   │   │   ├── marketplace/         # Pazar yeri (satıcı)
│   │   │   ├── sellers/             # Satıcı profilleri
│   │   │   ├── dashboard/           # Admin dashboard API
│   │   │   ├── plans/               # Subscription planları
│   │   │   └── payments/            # 💳 Ödeme işleri (TODO)
│   │   │
│   │   └── dev/                     # 🛠️ Development only
│   │       └── dev.controller.ts
│   │
│   ├── prisma/
│   │   ├── schema.prisma            # 📋 Database schema (492 satır)
│   │   ├── migrations/              # 20 database migration
│   │   │   ├── 20260203141947_init_user/
│   │   │   ├── 20260204121320_saas_core_init/
│   │   │   ├── ... (18 more)
│   │   │   └── migration_lock.toml
│   │   └── seed.js                  # Database seeding
│   │
│   ├── test/                        # 🧪 E2E Tests
│   │   ├── app.e2e-spec.ts
│   │   ├── auth-users.e2e-spec.ts
│   │   ├── customers.e2e-spec.ts
│   │   ├── orders-payments.e2e-spec.ts
│   │   ├── products.e2e-spec.ts
│   │   ├── appointments.e2e-spec.ts
│   │   ├── settings.e2e-spec.ts
│   │   ├── jest-e2e.json
│   │   └── helpers/
│   │
│   ├── uploads/                     # 📁 Yüklenen dosyalar
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   └── nest-cli.json
│
├── frontend/                        # 🎨 Next.js Client
│   ├── src/
│   │   ├── app/                    # 📄 Sayfalar (App Router)
│   │   │   ├── page.tsx            # Anasayfa
│   │   │   ├── layout.tsx          # Root layout
│   │   │   ├── providers.tsx       # Redux + React Query provider
│   │   │   ├── globals.css         # Global styles
│   │   │   ├── middleware.ts       # Middleware (auth check)
│   │   │   │
│   │   │   ├── login/              # /login
│   │   │   │   └── page.tsx
│   │   │   ├── register/           # /register
│   │   │   │   └── page.tsx
│   │   │   ├── forgot-password/    # /forgot-password
│   │   │   │   └── page.tsx
│   │   │   ├── reset-password/     # /reset-password?token=xxx
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── shop/               # /shop (product listing)
│   │   │   │   └── page.tsx
│   │   │   ├── categories/         # /categories
│   │   │   │   └── page.tsx
│   │   │   ├── products/           # /products/:id
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── cart/               # /cart
│   │   │   │   └── page.tsx
│   │   │   ├── checkout/           # /checkout (ödeme)
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── account/            # /account (profil)
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── profile/page.tsx
│   │   │   │   ├── orders/page.tsx
│   │   │   │   ├── appointments/page.tsx
│   │   │   │   ├── addresses/page.tsx
│   │   │   │   ├── favorites/page.tsx
│   │   │   │   ├── reviews/page.tsx
│   │   │   │   └── settings/page.tsx
│   │   │   │
│   │   │   ├── admin/              # /admin (dashboard)
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── products/page.tsx
│   │   │   │   ├── customers/page.tsx
│   │   │   │   ├── orders/page.tsx
│   │   │   │   └── users/page.tsx
│   │   │   │
│   │   │   ├── error.tsx           # Error boundary
│   │   │   ├── loading.tsx         # Custom loader
│   │   │   └── not-found.tsx       # 404 page
│   │   │
│   │   ├── components/             # 🧩 React components
│   │   │   ├── common/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Spinner.tsx
│   │   │   │   ├── FormInput.tsx
│   │   │   │   └── FormError.tsx
│   │   │   │
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Navigation.tsx
│   │   │   │
│   │   │   ├── products/
│   │   │   │   ├── ProductCard.tsx
│   │   │   │   ├── ProductList.tsx
│   │   │   │   ├── ProductFilter.tsx
│   │   │   │   └── ProductDetail.tsx
│   │   │   │
│   │   │   ├── cart/
│   │   │   │   ├── CartSummary.tsx
│   │   │   │   ├── CartItem.tsx
│   │   │   │   └── CartEmpty.tsx
│   │   │   │
│   │   │   ├── checkout/
│   │   │   │   ├── CheckoutStepper.tsx
│   │   │   │   ├── PaymentModal.tsx (TODO)
│   │   │   │   └── OrderSummary.tsx
│   │   │   │
│   │   │   ├── admin/
│   │   │   │   ├── AdminHeader.tsx
│   │   │   │   ├── AdminSidebar.tsx
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   └── StatCard.tsx
│   │   │   │
│   │   │   └── auth/
│   │   │       ├── LoginForm.tsx
│   │   │       ├── RegisterForm.tsx
│   │   │       └── ProtectedRoute.tsx
│   │   │
│   │   ├── hooks/                  # 🪝 Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useCart.ts
│   │   │   └── useApi.ts
│   │   │
│   │   ├── api/                    # 🌐 API client
│   │   │   ├── products.api.ts
│   │   │   ├── orders.api.ts
│   │   │   ├── auth.api.ts
│   │   │   └── customers.api.ts
│   │   │
│   │   ├── store/                  # 📦 Redux store
│   │   │   ├── index.ts
│   │   │   ├── userSlice.ts        # User state
│   │   │   ├── cartSlice.ts        # Cart state
│   │   │   └── middleware/         # Persist middleware
│   │   │
│   │   ├── services/               # 🔧 Services
│   │   │   ├── api.ts              # Axios instance
│   │   │   ├── auth.service.ts
│   │   │   └── storage.service.ts
│   │   │
│   │   ├── types/                  # 📝 TypeScript types
│   │   │   ├── index.ts
│   │   │   ├── api.ts
│   │   │   ├── models.ts
│   │   │   └── auth.ts
│   │   │
│   │   ├── utils/                  # 🛠️ Utilities
│   │   │   ├── helpers.ts
│   │   │   ├── validators.ts
│   │   │   ├── formatters.ts
│   │   │   └── constants.ts
│   │   │
│   │   ├── constants/              # 📌 Constant values
│   │   │   ├── api.ts
│   │   │   ├── roles.ts
│   │   │   └── messages.ts
│   │   │
│   │   └── lib/                    # 📚 Library utilities
│   │       └── classnames.ts
│   │
│   ├── public/                     # 🖼️ Static assets
│   │   └── hero/
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   └── tailwind.config.ts
│
├── scripts/                        # 🔨 Build scripts
│   ├── deploy.sh
│   └── deploy.ps1
│
├── package.json                    # Root workspace
├── ecosystem.config.cjs            # PM2 config
├── PLAN.md                         # Yapılacaklar planı
├── CODE-ANALYSIS-REPORT.md         # Kod analiz raporu
├── IMPLEMENTATION-SUMMARY.md       # Impleme. özeti
└── README.md                       # Bu dosya

```

---

## 🔌 BAĞIMLILIK HARITASI (Dependency Map)

### Backend Dependencies

```
┌─────────────────────────────────────────┐
│          NestJS Framework               │
│  (11.0.1 - Node.js runtime)            │
├─────────────────────────────────────────┤
│
├─ @nestjs/core (11.0.1)
│  └─ İçerik: Module, Controller, Provider yapıları
│     │
│     ├─ @nestjs/common (11.0.1)
│     │  └─ HttpException, Injectable, UseGuards, etc.
│     │
│     ├─ reflect-metadata (0.2.2)
│     │  └─ Decorator desteği (TypeScript)
│     │
│     └─ rxjs (7.8.1)
│        └─ Observable, Subject, async işlemler
│
├─ @nestjs/platform-express (11.0.1)
│  └─ Express.js adapter
│     └─ multer (1.4.5-lts.1) → File upload
│
├─ @nestjs/jwt (11.0.0)
│  └─ JWT token generation/validation
│     └─ jsonwebtoken internal
│
├─ @nestjs/passport (11.0.5)
│  └─ Passport.js adapter
│     ├─ passport (0.7.0)
│     │  └─ Auth middleware framework
│     │
│     └─ passport-jwt (4.0.1)
│        └─ JWT strategy implementation
│
├─ @nestjs/config (4.0.0)
│  └─ Environment variable management
│     └─ .env file loading
│
├─ @nestjs/swagger (11.0.3)
│  └─ API documentation
│     └─ swagger-ui-express (5.0.1)
│
├─ bcryptjs (2.4.3)
│  └─ Password hashing/verification
│     └─ Used in auth.service.ts
│
├─ nodemailer (6.9.16)
│  └─ Email sending
│     └─ SMTP configuration
│
├─ class-validator (0.14.1)
│  └─ DTO validation (decorators)
│     └─ @IsEmail, @IsString, @Min, etc.
│
├─ class-transformer (0.5.1)
│  └─ Class to plain object conversion
│     └─ @Type, @Transform decorators
│
└─ Prisma ORM (7.3.0)
   ├─ @prisma/client (7.3.0)
   │  └─ Database client generation
   │
   ├─ @prisma/adapter-pg (7.3.0)
   │  └─ PostgreSQL adapter
   │
   └─ pg (8.18.0)
      └─ PostgreSQL driver (native)

```

### Frontend Dependencies

```
┌─────────────────────────────────────────┐
│          Next.js Framework              │
│  (16.1.6 - React 19.2.3 based)         │
├─────────────────────────────────────────┤
│
├─ react (19.2.3)
│  └─ React core library
│     └─ react-dom (19.2.3)
│        └─ DOM rendering
│
├─ next (16.1.6)
│  ├─ App Router (file-based routing)
│  ├─ Server/Client components
│  ├─ API routes (obsolete in our case)
│  └─ Middleware support
│
├─ State Management
│  ├─ @reduxjs/toolkit (2.11.2)
│  │  └─ Redux + utilities
│  │     └─ createSlice, configureStore
│  │
│  ├─ react-redux (9.2.0)
│  │  └─ Redux provider, hooks
│  │     └─ useAppDispatch, useAppSelector
│  │
│  └─ @tanstack/react-query (5.90.20)
│     └─ Server state management
│        └─ useQuery, useMutation
│
├─ Forms & Validation
│  ├─ react-hook-form (7.71.1)
│  │  └─ Form state management
│  │     └─ useForm, register, watch
│  │
│  ├─ @hookform/resolvers (5.2.2)
│  │  └─ Validation resolver integration
│  │
│  └─ yup (1.7.1)
│     └─ Schema validation
│        └─ object().shape(), string().required()
│
├─ HTTP Client
│  └─ axios (1.13.4)
│     └─ HTTP requests
│        └─ GET, POST, PATCH, DELETE
│
├─ UI & Icons
│  └─ lucide-react (0.563.0)
│     └─ Icon library
│        └─ <ShoppingCart>, <Heart>, etc.
│
├─ Notifications
│  └─ react-hot-toast (2.6.0)
│     └─ Toast notifications
│        └─ toast.success(), toast.error()
│
├─ Styling
│  ├─ tailwindcss (4 - latest)
│  │  └─ Utility-first CSS framework
│  │     └─ @tailwindcss/postcss (4)
│  │
│  └─ postcss (auto)
│     └─ CSS processing
│        └─ Tailwind plugin
│
└─ Build Tools (devDependencies)
   ├─ typescript (5)
   │  └─ Type checking
   │
   ├─ eslint (9)
   │  └─ Code linting
   │     └─ eslint-config-next (16.1.6)
   │
   └─ babel-plugin-react-compiler (1.0.0)
      └─ React compiler optimization

```

---

## 💾 DATABASE ARCHITECTURE

### Veritabanı Dili & ORM

| Bileşen | Teknoloji | Versiyon | Rol |
|---------|-----------|---------|-----|
| Database | PostgreSQL | 14+ | Relational DB |
| ORM | Prisma | 7.3.0 | Type-safe DB access |
| Driver | pg | 8.18.0 | PostgreSQL native driver |
| Adapter | @prisma/adapter-pg | 7.3.0 | Prisma ↔ PG bridge |

### Schema Overview

```prisma
// 📊 Core Entities (492 satır prisma/schema.prisma)

Business (Multi-tenant root)
├─ id (PK)
├─ name

User (Kimlik doğrulama)
├─ id (PK)
├─ businessId (FK → Business)
├─ phone (unique)
├─ email (unique)
├─ passwordHash
├─ role: ADMIN | STAFF | CUSTOMER | SELLER

Customer (Müşteri profili)
├─ id (PK)
├─ businessId (FK → Business)
├─ userId (FK → User, unique - User-Customer linkage)
├─ name
├─ phone
├─ balance (müşteri kredisi)

Product (Ürün)
├─ id (PK)
├─ businessId (FK → Business)
├─ categoryId (FK → Category)
├─ name
├─ priceCents (cents cinsinden: 1000 = 10 TL)
├─ stock (null = unlimited)
├─ imageUrl, images[]
├─ type: PHYSICAL | SERVICE | WEIGHT | CUSTOM
├─ tags[]
├─ seoTitle, seoDescription

Category (Kategori)
├─ id (PK)
├─ businessId (FK → Business)
├─ name
├─ slug (auto-generated from name)
├─ parentCategoryId (self-reference)

Order (Sipariş)
├─ id (PK)
├─ businessId (FK → Business)
├─ customerId (FK → Customer)
├─ totalAmountCents
├─ statusId (FK → OrderStatus)
├─ source: POS | MOBILE | WEB | API
├─ notes

OrderItem (Sipariş satırı)
├─ id (PK)
├─ orderId (FK → Order)
├─ productId (FK → Product)
├─ quantity
├─ unitPriceCents (snapshot - değişse bile kayıt)
├─ totalAmountCents

OrderStatus (Sipariş durumu)
├─ id (PK)
├─ businessId (FK → Business)
├─ key: string (CREATED, PAID, SHIPPED, DELIVERED, CANCELLED)
├─ isDefault (varsayılan durum)
├─ isFinal (son durum, değiştirilemiyor)

Payment (Ödeme kaydı)
├─ id (PK)
├─ businessId (FK → Business)
├─ orderId (FK → Order)
├─ amountCents
├─ method: PaymentMethod (CASH | CARD | TRANSFER | OTHER)
├─ reference (ödeme referansı/token)

Appointment (Randevu)
├─ id (PK)
├─ businessId (FK → Business)
├─ customerId (FK → Customer)
├─ staffUserId (FK → User)
├─ startAt (DateTime)
├─ endAt (DateTime)
├─ status: SCHEDULED | CONFIRMED | COMPLETED | CANCELLED | NO_SHOW

CustomerAddress (Müşteri adresi)
├─ id (PK)
├─ customerId (FK → Customer)
├─ title: String (Ev, İş, etc.)
├─ fullName, phone, line1, line2
├─ city, district, postalCode, country
├─ isDefaultShipping, isDefaultBilling

Settings (İşletme ayarları - Key-Value)
├─ id (PK)
├─ businessId (FK → Business)
├─ key: String (unique per business)
├─ value: Json (any)
```

### Migration Tarihi

```
1. 20260203141947_init_user        → User, Business, Role
2. 20260204121320_saas_core_init   → Core SaaS entities
3. 20260204122259_add_customer_balance
4. 20260204125714_add_product_order_domain
5. 20260204133759_add_appointment_domain
6. 20260205115847_add_product_enrichment
7. 20260206090318_categories
8. 20260206104430_add_user_password_hash
9. 20260207102958_auth_customer_reset
10. 20260211130500_add_user_customer_link  ← İMPORTANT: User.id ↔ Customer.userId
11. 20260212130447_add_product_subtitle_features
12. 20260212133830_add_product_images_array
13-20. (Ek özellikler - addresses, favorites, reviews, etc.)
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Auth Flow (JWT + Passport)

```
[Frontend]                         [Backend]
    │                                 │
    ├─ POST /auth/login            →  ├─ LoginDto validate
    │  (phone/email + password)       │  ├─ User lookup (phone or email)
    │                                 │  ├─ bcrypt.compare(password)
    │                                 │  ├─ JWT generate: payload = {userId, businessId, phone, role}
    │                                 │  ├─ RefreshToken generate
    │                                 │  └─ Set httpOnly cookies
    │  ← {accessToken, ...}           │
    │                                 │
    ├─ Store Redux + localStorage     │
    │                                 │
    ├─ GET /api/products           →  ├─ JwtAuthGuard ekstrakte eder
    │  (Authorization header)         │  ├─ JWT verify (secret key)
    │                                 │  ├─ req.user = JwtPayload oluştur
    │                                 │  └─ Handler çalıştır
    │  ← [products]                   │
    │                                 │
    ├─ POST /orders                →  ├─ JwtAuthGuard
    │                                 │  ├─ RolesGuard (@Roles('CUSTOMER'))
    │                                 │  └─ Check: currentUser.role in ['CUSTOMER', ...]
    │  ← {orderId, ...} OR 403        │
```

### JWT Payload Structure

```typescript
interface JwtPayload {
  userId: number;
  businessId: number;
  phone: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER' | 'SELLER';
  iat: number;  // issued at
  exp: number;  // expires at (15 min access, 7 day refresh)
}
```

### Role-Based Access Control (RBAC)

```typescript
// Decorator example
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')  // Only ADMIN and STAFF
@Post('orders')
create(@Req() req: { user: JwtPayload }) {
  // req.user: JwtPayload = {userId, businessId, role, ...}
}
```

**Role Hiyerarşisi:**

- 🔴 ADMIN: Tüm erişim, diğer kullanıcı yönetimi
- 🟠 STAFF: Müşteri/Ürün/Sipariş yönetimi (kendi oluşturdukları)
- 🟡 CUSTOMER: Kendi profili, siparişleri, randevuları (readonly diğer)
- 🟢 SELLER: Kendi ürünleri, satışlar (commission-based)

---

## 🛠️ BACKEND ARCHITECTURE

### Module Structure

**Module = Route grouping + Dependencies + Business logic**

```typescript
// Örnek: CustomersModule
@Module({
  controllers: [CustomersController],
  providers: [CustomersService],
  imports: [DatabaseModule],  // Prisma dependency
  exports: [CustomersService],  // Başka modules'ın kullanabileceği
})
export class CustomersModule {}
```

### Request Flow (End-to-End)

```
REQUEST: POST /customers
         Headers: { Authorization: "Bearer JWT_TOKEN" }
         Body: { name: "John", phone: "905..." }

         ↓

[HTTP Server - Express]
├─ incoming request

         ↓

[Global Middleware]
├─ CORS check
├─ Body parser (JSON)
├─ logger

         ↓

[Route Matching]
├─ POST /customers → CustomersController.create()

         ↓

[@Guard - JwtAuthGuard]
├─ Extract Authorization header
├─ JWT verify (signature + expiration)
├─ req.user = JwtPayload {userId, businessId, role, ...}
├─ If invalid → throw UnauthorizedException (401)

         ↓

[@Guard - RolesGuard]
├─ Read @Roles metadata
├─ Check currentUser.role in allowed roles
├─ If denied → throw ForbiddenException (403)

         ↓

[@Decorator - DTO Validation]
├─ CreateCustomerDto schema check
├─ - name: IsString, MinLength(2)
├─ - phone: IsString, Matches(/regex/)
├─ If invalid → throw BadRequestException (400)

         ↓

[CustomersController.create()]
├─ @Req() req: {user: JwtPayload}
├─ @Body() payload: CreateCustomerDto
├─ this.customersService.create(req.user, payload)

         ↓

[CustomersService.create()]
├─ const businessId = req.user.businessId
├─ const createdByUserId = req.user.userId
├─
├─ // Database transaction
├─ return this.prisma.$transaction(async (tx) => {
├─   const customer = await tx.customer.create({
├─     data: { businessId, createdByUserId, name, phone }
├─   })
├─   // Other operations
├─   return CustomerSummary
├─ })

         ↓

[Response Formatter]
├─ Return object serialized to JSON
├─ HTTP 200 OK

         ↓

[Response Interceptor]
├─ { success: true, data: CustomerSummary }

         ↓

RESPONSE: 200 OK
          { id: 1, name: "John", phone: "905...", balance: 0 }
```

### Service Layer Pattern

```typescript
// Service = Business logic, DB operations
@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,  // Dependency injection
  ) {}

  async create(user: JwtPayload, payload: CreateCustomerDto) {
    // 1. Authorization check
    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      throw new ForbiddenException('Not allowed');
    }

    // 2. Input validation (extra server-side)
    const businessId = Number(user.businessId);
    const createdByUserId = Number(user.userId);

    // 3. Database operation
    const customer = await this.prisma.customer.create({
      data: {
        businessId,
        createdByUserId,
        ...payload,
      },
      select: { id: true, name: true, phone: true },
    });

    // 4. Return DTO
    return customer;
  }
}
```

---

## 🎨 FRONTEND ARCHITECTURE

### App Router (Next.js 12+)

```
File-based routing (src/app/)

/                          → RootLayout + HomePage
/login                     → LoginPage
/auth/reset-password       → ResetPasswordPage
/shop                      → ShopPage
/products/[id]            → ProductDetailPage
/cart                      → CartPage
/checkout                  → CheckoutPage
/account                   → AccountRootLayout
  /account/profile        → ProfilePage
  /account/orders         → OrdersPage
  /account/addresses      → AddressesPage
  /admin                  → AdminRootLayout + DashboardPage
```

### State Management (Redux + React Query)

```typescript
// Redux (Client state - User, Cart)
store = {
  user: {
    user: User | null,
    token: string | null,
    status: 'idle' | 'authenticated' | 'error'
  },
  cart: {
    items: CartItem[],
    totalPrice: number,
  }
}

// React Query (Server state - Products, Orders)
useQuery('products', () => api.get('/products'))
useMutation(..., () => api.post('/orders'))
```

### Component Hierarchy

```
RootLayout
├─ Header
│  ├─ Logo
│  ├─ SearchBar
│  ├─ CartIcon (Redux → items.length)
│  └─ AuthButtons (Redux → user.status)
│
├─ Page (route-specific)
│
└─ Footer
   ├─ ContactInfo
   ├─ Links
   └─ SocialMedia

// Example: /checkout
CheckoutPage (client)
├─ CheckoutStepper (steps indicator)
├─ OrderSummary (Redux cart)
├─ CustomerForm (API: GET /customers/me)
├─ PaymentModal (API: POST /payments - TODO)
└─ SuccessMessage OR ErrorMessage
```

### Form Flow (React Hook Form + Yup)

```typescript
const useLoginForm = () => {
  // 1. Define schema (Yup)
  const schema = yup.object().shape({
    phone: yup.string().required('Phone required'),
    password: yup.string().required('Password required'),
  });

  // 2. Setup form (React Hook Form)
  const { register, handleSubmit, formState: {errors}, watch } = useForm({
    resolver: yupResolver(schema),
    mode: 'onBlur',
  });

  // 3. Submit handler
  const onSubmit = async (data) => {
    try {
      const response = await api.post('/auth/login', data);
      dispatch(setCredentials({user: response.user, token: response.token}));
      router.push('/');
    } catch (error) {
      dispatch(setAuthError(error.message));
    }
  };

  return { register, handleSubmit, errors, onSubmit };
};
```

---

## 🔄 DATA FLOW (Örnek: Sipariş Oluşturma)

```
┌──────────────────────────────────────────────────────────────────┐
│  CHECKOUT FLOW: Sepet → Müşteri → Ödeme → Sipariş              │
└──────────────────────────────────────────────────────────────────┘

STEP 1: Frontend Cart Management (Redux)
────────────────────────────────────────
[User clicks "Add to Cart"]
    ↓
  dispatch(addToCart({productId: 1, quantity: 2}))
    ↓
  Redux Toolkit → cartSlice reducer
    ↓
  Store updated: { items: [{productId, quantity, ...}], totalPrice: 5000 }
    ↓
  localStorage persisted (Redux persist middleware)


STEP 2: Checkout Page Load (API + User verification)
──────────────────────────────────────────────────────
[User visits /checkout]
    ↓
  CheckoutPage useEffect triggered
    ↓
  if (!isAuthenticated) → redirect /login
    ↓
  API call: GET /customers/me
    ↓
  Backend:
    ├─ JwtAuthGuard verify token
    ├─ findOrCreateForUser(currentUser)
    │   ├─ Check: User → Customer mapping exists?
    │   ├─ If no: Create default customer record
    │   └─ Return: { id, name, phone, balance }
    ↓
  Frontend gets: { customerId, customerName, ... }
    ↓
  setState(...) → render customer form


STEP 3: Payment Initialization (Frontend → Backend)
─────────────────────────────────────────────────────
[User submits checkout form]
    ↓
  handleSubmit()
    ↓
  Validation checks:
    ├─ Cart not empty?
    ├─ Customer ID present?
    └─ Amount > 0?
    ↓
  Payload build:
  {
    customerId: 123,
    items: [{productId: 1, quantity: 2}, ...],
    notes: "Gift wrapping requested"
  }
    ↓
  API call: POST /orders
    ↓
  Backend (OrdersService.create):
    ├─ Get current user: JwtPayload
    ├─ Find customer by ID with businessId check
    ├─ Fetch products from DB
    ├─ TRANSACTION START:
    │  ├─ Validate stock (inside transaction)
    │  ├─ Decrement stock for each item
    │  ├─ Create order record
    │  ├─ Create order items (snapshot price)
    │  ├─ Set order status → CREATED (from settings)
    │  └─ TRANSACTION COMMIT
    ├─ Return OrderDetail: {id, customerId, totalAmountCents, items[], status}
    ↓
  Frontend receives: { orderId: 456, total: 50000, ... }
    ↓
  dispatch(clearCart()) → Clear Redux
    ↓
  setOrderSuccess(true) → Show success page


STEP 4: Payment Processing (Ödeme entegrasyonu - TO DO)
────────────────────────────────────────────────────────
[Success page shown with order number]
    ↓
  Option 1: Redirect to iyzico payment page
  Option 2: Redirect to PayTR payment page
    ↓
  Backend creates payment session:
    ├─ POST /payments/initialize
    ├─ Provider selection: iyzico OR paytr
    ├─ Call iyzico SDK / PayTR API
    ├─ Return: { redirectUrl, token }
    ↓
  Frontend redirects to payment provider
    ↓
  [User enters card details on iyzico/PayTR]
    ↓
  Payment provider processes payment
    ↓
  Webhook callback: POST /webhooks/iyzico or /webhooks/paytr
    ├─ Verify webhook signature
    ├─ Update Payment record: status → COMPLETED
    ├─ Update Order status: CREATED → PAID
    ├─ Send confirmation email
    ├─ Update customer balance if prepaid
    ↓
  Frontend return URL: /checkout/success?orderId=456
    ↓
  [Success page displayed]


STEP 5: Order History Access
──────────────────────────────
[User goes to /account/orders]
    ↓
  OrdersPage useQuery hook:
    ├─ GET /orders?page=1&pageSize=10
    ├─ Backend (OrdersService.findAllPaginated):
    │  ├─ Check user role
    │  ├─ If CUSTOMER: Find customer by phone (from JWT)
    │  │              Get orders where customerId = customer.id
    │  ├─ If STAFF: Get orders created by this staff
    │  ├─ If ADMIN: Get all orders
    │  ├─ Return paginated results
    ↓
  Frontend displays: [Order #456, Order #457, ...]
    ↓
  User clicks order → GET /orders/:id
    ↓
  Backend returns: { id, items[], totalAmount, status, createdAt, payments[] }
    ↓
  Frontend renders: OrderDetailPage with items, total, status timeline
```

---

## 🌐 API ENDPOINTS SUMMARY

### Authentication

```
POST   /auth/login             → {accessToken, refreshToken, user}
POST   /auth/register          → {accessToken, refreshToken, user}
POST   /auth/logout            → Clear cookies
POST   /auth/forgot-password   → Send reset email
POST   /auth/reset-password    → Reset with token
GET    /auth/profile           → Current user profile
PATCH  /auth/profile           → Update profile
PATCH  /auth/change-password   → Change password
```

### Customers

```
GET    /customers              → List (ADMIN/STAFF)
POST   /customers              → Create (ADMIN/STAFF)
GET    /customers/:id          → Get one
PATCH  /customers/:id          → Update
DELETE /customers/:id          → Delete
GET    /customers/me           → Get current user's customer record
```

### Products

```
GET    /products               → List all (paginated)
POST   /products               → Create (ADMIN/STAFF)
GET    /products/:id           → Get one
PATCH  /products/:id           → Update
DELETE /products/:id           → Delete
GET    /products/public        → Public catalog (no auth)
```

### Orders

```
GET    /orders                 → List (RBAC scoped)
POST   /orders                 → Create (ADMIN/STAFF) → TO DO: Customer access
GET    /orders/:id             → Get order detail
PATCH  /orders/:id             → Update order (status, etc.)
GET    /orders/:id/payments    → List payments for order
POST   /orders/:id/payments    → Add payment record
```

### Appointments

```
GET    /appointments           → List (RBAC scoped)
POST   /appointments           → Create (ADMIN/STAFF)
GET    /appointments/:id       → Get detail
PATCH  /appointments/:id       → Update
DELETE /appointments/:id       → Delete
```

### Uploads

```
POST   /uploads                → Upload file (ADMIN/STAFF)
                                → Returns: {filename, url}
```

### Payments (TO DO)

```
POST   /payments/initialize    → Create payment session
POST   /webhooks/iyzico        → iyzico callback
POST   /webhooks/paytr         → PayTR callback
GET    /payments/:id/status    → Check payment status
POST   /payments/:id/refund    → Refund payment
```

---

## 🚀 ÇALIŞTIRMA & DEPLOYMENT

### Local Development

```bash
# Terminal 1: Backend
cd backend
npm install
npm run start:dev           # Watch mode, http://localhost:3001

# Terminal 2: Frontend
cd frontend
npm install
npm run dev                 # http://localhost:3000

# Terminal 3: Database (if local PostgreSQL)
# OR use Docker: docker run -e POSTGRES_PASSWORD=postgres postgres:14
```

### Environment Variables

**Backend (.env):**
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/nutopiano

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRATION=900              # 15 minutes
REFRESH_TOKEN_EXPIRATION=604800 # 7 days

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=app-password

# Site
SITE_URL=http://localhost:3000
BUSINESS_NAME=Nutopiano

# Payments (Future)
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
PAYTR_MERCHANT_ID=
PAYTR_MERCHANT_KEY=
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Database Setup

```bash
cd backend

# 1. Create database
createdb nutopiano

# 2. Run migrations
npx prisma migrate deploy

# 3. Generate Prisma client
npx prisma generate

# 4. Migration parity checks (CI parity)
npm run prisma:validate -w backend
npm run prisma:migrate:status -w backend

# 5. Seed initial data (optional)
npx prisma db seed
```

### Build & Deploy

```bash
# Backend
npm run build        # → dist/
npm run start:prod   # Production

# Frontend
npm run build        # → .next/
npm run start        # Production
```

---

## 🧪 TESTING

### Backend E2E Tests

```bash
# Run tests
npm run test:e2e

# Test files:
test/app.e2e-spec.ts
test/auth-users.e2e-spec.ts
test/customers.e2e-spec.ts
test/orders-payments.e2e-spec.ts
test/products.e2e-spec.ts
test/appointments.e2e-spec.ts
test/settings.e2e-spec.ts
```

### Frontend UI Smoke (Playwright)

```bash
# Playwright smoke suite
npm run test:e2e:ui -w frontend

# optional env vars for seller-auth smoke scenarios
PLAYWRIGHT_SELLER_PHONE=5XXXXXXXXX
PLAYWRIGHT_SELLER_PASSWORD=your-password
PLAYWRIGHT_SELLER_SLUG=your-seller-slug
```

---

## 📝 CODING STANDARDS

### TypeScript

- ✅ Strict mode enabled
- ✅ Interface-based design
- ✅ Type safety everywhere
- ✅ No `any` types (avoid)

### Backend

- ✅ Service → Controller pattern
- ✅ DTO validation (class-validator)
- ✅ Exception hierarchy (NotFoundException, ForbiddenException)
- ✅ Logging (console → Winston preferred)
- ⚠️ Need: Rate limiting, CSRF tokens

### Frontend

- ✅ React hooks (no class components)
- ✅ Component separation (containers vs presentational)
- ✅ Redux slices (modern approach)
- ✅ Custom hooks (useAuth, useCart)
- ⚠️ Need: Error boundaries, loading skeletons

---

## 🐛 YAYGИН HATALAR & ÇÖZÜMLER

| Hata | Nedeni | Çözüm |
|------|--------|-------|
| `Cannot find module '@nestjs/...'` | npm install eksik | `npm install` en backend dir |
| `PrismaClient not found` | Prisma client gen. yapılmadı | `npx prisma generate` |
| `JWT malformed` | Token'da boşluk/gizli char | Token.trim(), check headers |
| `ECONNREFUSED 5432` | PostgreSQL kapalı | `docker run postgres:14` or start service |
| `localStorage undefined (SSR)` | Server-side rendering | Check `typeof window !== 'undefined'` |
| `CORS error` | Frontend-backend domain fark | Check CORS config in backend |
| `401 Unauthorized` | Token expired/invalid | Refresh token endpoint call |
| `403 Forbidden` | User role not allowed | Check @Roles decorator |

---

## 📚 KAYNAKLAR

- 📖 [NestJS Documentation](https://docs.nestjs.com)
- 📖 [Next.js Documentation](https://nextjs.org)
- 📖 [Prisma Documentation](https://www.prisma.io/docs)
- 📖 [React Hook Form](https://react-hook-form.com)
- 📖 [Redux Toolkit](https://redux-toolkit.js.org)
- 📖 [Tailwind CSS](https://tailwindcss.com)

---

## 🎯 SONRAKI ADIMLAR

Yazarken:
1. ✅ Backend: NestJS + REST API
2. ✅ Frontend: Next.js + React
3. ✅ Database: Prisma + PostgreSQL
4. ⏳ Payments: iyzico + PayTR (PLAN.md'de detaylı)
5. ⏳ Security: Rate limiting, CSRF (PLAN.md'de detaylı)
6. ⏳ Testing: E2E + Unit tests

---

**Son Güncelleme:** 21 Şubat 2026  
**Dokümantasyon Versiyonu:** 1.0  
**Yazarı:** Technical Documentation System
