# Nutopiano — Tech Docs (Merged)

Bu dosya repodaki teknik/dokümantasyon amaçlı markdown dosyalarının birleştirilmiş halidir.



---

## Source: README.md

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

# 4. Seed initial data (optional)
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

### Frontend Tests (TO DO)

```bash
# Jest setup (to be added)
npm run test
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


---

## Source: NUTOPIANO-KILAVUZ.md

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


---

## Source: DOCKER.md

# Docker Quick Start

This project includes Docker setup for local development.

## Files

- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`

## Start

```bash
docker compose up -d --build
```

This starts core services only (`frontend`, `backend`, `postgres`, `redis`).

Services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001/api/v1`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Optional observability stack (Prometheus + Grafana):

```bash
docker compose --profile observability up -d --build
```

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3003` (`admin` / `admin`)

## Stop

```bash
docker compose down
```

To remove DB/Redis volumes as well:

```bash
docker compose down -v
```

## Notes

- Backend runs `prisma migrate deploy` on start and retries until DB is ready.
- `depends_on` uses service health checks for startup ordering.
- Containers run built production artifacts (`start:prod`, `next start`) for predictable local parity.
- Default credentials in compose are for local development only.
- Update `JWT_SECRET` and DB credentials before any non-local usage.


---

## Source: CLOUDFLARE.md

# Cloudflare CDN Cutover Guide

This runbook covers `D-03 Cloudflare CDN` rollout for Nutopiano.

## Scope

- `nutopiano.com` and `www.nutopiano.com` (frontend)
- `api.nutopiano.com` (backend API)

## 0. Required Access (From You)

You need these before cutover:

1. Domain registrar access (to change nameservers).
2. Cloudflare account access for the domain zone.
3. SSH access to origin server (Nginx host).
4. Current origin public IP address.
5. Existing mail DNS records list (`MX`, SPF, DKIM, DMARC), if mail is active on this domain.

## 1. Pre-Cutover Preparation

1. Lower current DNS TTL to `300` (if provider allows), at least 15-30 minutes before nameserver switch.
2. Take a snapshot of current DNS records.
3. Confirm backend health from origin:
   - `https://api.nutopiano.com/api/v1/health`
4. Keep rollback note: current nameservers and current DNS records.

## 2. Cloudflare Zone Setup

1. Add domain to Cloudflare.
2. Import DNS records.
3. Update registrar nameservers to Cloudflare-provided nameservers.
4. Wait until zone status is `Active`.

## 3. DNS Records (Cloudflare)

Recommended baseline:

- `A @ -> <origin_ip>` (Proxy: ON, orange cloud)
- `A www -> <origin_ip>` (Proxy: ON)
- `A api -> <origin_ip>` (Proxy: ON)

Notes:

- Keep all required mail records exactly as-is.
- If a service must bypass Cloudflare, set that record to Proxy OFF (gray cloud).

## 4. SSL/TLS Settings

Cloudflare dashboard:

1. SSL/TLS mode: `Full (strict)`.
2. Enable `Always Use HTTPS`.
3. Enable `Automatic HTTPS Rewrites`.
4. HTTP: keep HTTP/2 and HTTP/3 enabled.

Origin certificate on server:

- Option A: Let's Encrypt certs on origin.
- Option B: Cloudflare Origin Certificate on Nginx.

## 5. Origin Hardening (Nginx + Real IP)

Do not trust `CF-Connecting-IP` without trusted Cloudflare CIDRs.

1. Generate real IP snippet:
   - Linux/macOS:
     - `bash scripts/update-cloudflare-realip.sh`
   - Windows/PowerShell:
     - `powershell -File scripts/update-cloudflare-realip.ps1`
2. Place generated file at:
   - `/etc/nginx/snippets/cloudflare-realip.conf`
3. Include it in Nginx config:
   - `include /etc/nginx/snippets/cloudflare-realip.conf;`
4. Validate and reload:
   - `nginx -t`
   - `sudo systemctl reload nginx`

Reference config: `scripts/nginx.example.conf`

## 6. Cloudflare Rules (Recommended Baseline)

### Cache

1. Bypass cache for API:
   - Hostname `api.nutopiano.com` OR path starts with `/api/`.
2. Cache static assets aggressively:
   - Extensions: `css, js, mjs, jpg, jpeg, png, gif, webp, svg, ico, woff2`
   - Edge TTL: 1d-7d (based on release cadence).

### Security

1. Enable WAF managed rules.
2. Enable Bot Fight Mode.
3. Add rate limit rules:
   - `/api/v1/auth/login`
   - `/api/v1/auth/forgot-password`
4. Optional but recommended:
   - Restrict origin firewall inbound to Cloudflare IP ranges + SSH admin IP.

## 7. Validation

After proxy is enabled:

1. Site loads and auth works:
   - `https://nutopiano.com`
2. API health works:
   - `https://api.nutopiano.com/api/v1/health`
3. CDN headers exist:
   - `curl -I https://nutopiano.com`
   - `curl -I https://api.nutopiano.com/api/v1/health`
   - Expect Cloudflare headers like `cf-ray`.
4. Critical flows:
   - login, checkout, order create, POS API calls.
5. Verify origin logs have real visitor IP (not only Cloudflare edge IPs).

## 8. Rollback

1. Set affected DNS records to Proxy OFF temporarily.
2. Revert problematic cache/WAF/rate-limit rules.
3. If needed, switch registrar nameservers back to previous provider.
4. Keep origin certs valid during rollback window.


---

## Source: STAGING.md

# Staging Deployment Guide

This project now supports a dedicated staging profile.

## Files

- `ecosystem.staging.config.cjs`
- `scripts/deploy.sh` (`DEPLOY_ENV=staging`)
- `scripts/deploy.ps1 -DeployEnv staging`

## Expected Staging Defaults

- Backend PM2 app: `nutopiano-api-staging`
- Frontend PM2 app: `nutopiano-web-staging`
- Backend port: `3101`
- Frontend port: `3100`
- Frontend API URL: `https://staging-api.nutopiano.com/api/v1`

## Linux Remote Deploy

```bash
DEPLOY_ENV=staging \
APP_DIR=/var/www/nutopiano_app_staging \
BRANCH=staging \
ECOSYSTEM_FILE=ecosystem.staging.config.cjs \
bash /var/www/nutopiano_app_staging/scripts/deploy.sh
```

## Windows Trigger (PowerShell)

```powershell
.\scripts\deploy.ps1 `
  -HostName "YOUR_SERVER_IP" `
  -UserName "root" `
  -AppDir "/var/www/nutopiano_app_staging" `
  -Branch "staging" `
  -DeployEnv "staging"
```

## Notes

- `deploy.sh` updates `frontend/.env.local` and ensures `NEXT_PUBLIC_API_URL` is set for the target environment.
- Keep production and staging in separate folders and PM2 app names.
- Use separate database and Redis instances for staging.


---

## Source: MONITORING.md

# Monitoring Dashboard (Prometheus + Grafana)

Monitoring stack is provided via Docker Compose:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3003` (default `admin/admin`)

## Backend Metrics Endpoint

- Endpoint: `GET /api/v1/metrics`
- Format: Prometheus text exposition
- Includes Node.js default metrics via `prom-client`
- Includes custom metrics:
  - `nutopiano_http_requests_total`
  - `nutopiano_http_request_duration_seconds`
  - `nutopiano_db_connections`
  - `nutopiano_db_ping_duration_milliseconds`
  - `nutopiano_redis_used_memory_bytes`
  - `nutopiano_redis_connected_clients`

## Start Monitoring Stack

```bash
docker compose --profile observability up -d --build
```

## Prometheus Config

- File: `monitoring/prometheus/prometheus.yml`
- Scrape target: `backend:3001`
- Metrics path: `/api/v1/metrics`

## Grafana Provisioning

- File: `monitoring/grafana/provisioning/datasources/prometheus.yml`
- Prometheus datasource is preconfigured.
- File: `monitoring/grafana/provisioning/dashboards/dashboards.yml`
- Dashboard JSON: `monitoring/grafana/dashboards/nutopiano-overview.json`
- Default dashboard covers:
  - request rate
  - error rate
  - p95 response time
  - DB connection count / ping duration
  - Redis memory / connected clients

## Notes

- Change Grafana default admin credentials before non-local use.
- Keep monitoring data volumes persistent (`prometheus_data`, `grafana_data`).


---

## Source: MANAGED-POSTGRES.md

# Managed PostgreSQL Migration Guide

This document covers migration from current PostgreSQL to a managed provider (RDS, Railway, Supabase, etc.).

## Scripts

- Linux/macOS migrate: `scripts/migrate-to-managed-postgres.sh`
- Windows migrate: `scripts/migrate-to-managed-postgres.ps1`
- Linux/macOS verification: `scripts/verify-managed-postgres.sh`
- Windows verification: `scripts/verify-managed-postgres.ps1`

## Managed Service Baseline (Backup/Failover/Monitoring)

Before cutover, ensure these are enabled in your provider console:

1. Automated backups enabled (minimum 7 days retention, recommended 14-30 days).
2. Point-in-time recovery enabled.
3. High availability / automatic failover enabled (for example Multi-AZ in AWS RDS).
4. Monitoring and alerts configured for CPU, storage, connections and replication lag.
5. SSL/TLS enforced for connections (`sslmode=require` in `DATABASE_URL`).

Optional but recommended:

- Keep application-level logical backups with `scripts/backup-postgres.sh` or `scripts/backup-postgres.ps1` as a second recovery path.

## 1. Prepare Target Database

- Create managed PostgreSQL instance.
- Create DB user with required privileges.
- Whitelist app server IPs.
- Copy full connection URL including SSL params if required.

Example:

```text
postgresql://user:pass@host:5432/dbname?sslmode=require
```

## 2. Dump and Restore

Linux/macOS:

```bash
SOURCE_DATABASE_URL="postgresql://local_user:local_pass@localhost:5432/nutopiano" \
TARGET_DATABASE_URL="postgresql://managed_user:managed_pass@managed-host:5432/nutopiano?sslmode=require" \
bash scripts/migrate-to-managed-postgres.sh
```

Windows PowerShell:

```powershell
.\scripts\migrate-to-managed-postgres.ps1 `
  -SourceDatabaseUrl "postgresql://local_user:local_pass@localhost:5432/nutopiano" `
  -TargetDatabaseUrl "postgresql://managed_user:managed_pass@managed-host:5432/nutopiano?sslmode=require"
```

## 3. Apply Prisma Migrations on Target

```bash
DATABASE_URL="postgresql://managed_user:managed_pass@managed-host:5432/nutopiano?sslmode=require" \
npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

## 4. Verify

```bash
TARGET_DATABASE_URL="postgresql://managed_user:managed_pass@managed-host:5432/nutopiano?sslmode=require" \
bash scripts/verify-managed-postgres.sh
```

Windows PowerShell:

```powershell
.\scripts\verify-managed-postgres.ps1 `
  -TargetDatabaseUrl "postgresql://managed_user:managed_pass@managed-host:5432/nutopiano?sslmode=require"
```

## 5. Cutover

- Update server `DATABASE_URL` to managed DB URL.
- Restart backend.
- Validate `/api/v1/health` and critical flows.

## Rollback

- Keep old DB read-only copy for rollback window.
- If cutover fails, switch `DATABASE_URL` back and restart backend.
- Reconcile writes before next cutover attempt.


---

## Source: LOADTEST.md

# Load Testing (k6)

This project includes a baseline k6 scenario:

- `scripts/loadtest/k6-api-smoke.js`

It covers:

- `GET /api/v1/health`
- `GET /api/v1/marketplace/search`
- Optional login flow (`POST /api/v1/auth/login` + `GET /api/v1/auth/profile`)
- Optional order create flow (`POST /api/v1/orders`)
- Optional stock update flow (`PATCH /api/v1/products/:id`)

## Prerequisites

- Install k6: https://k6.io/docs/get-started/installation/
- Backend reachable from your machine.

## Quick Run

```bash
k6 run scripts/loadtest/k6-api-smoke.js
```

Defaults:

- Base URL: `http://localhost:3001/api/v1`
- VUs: `10`
- Duration: `1m`

## Auth Scenario

```bash
K6_BASE_URL=http://localhost:3001/api/v1 \
K6_PHONE=5xxxxxxxxx \
K6_PASSWORD='YourStrongPassword123!' \
k6 run scripts/loadtest/k6-api-smoke.js
```

## Order Scenario

```bash
K6_BASE_URL=http://localhost:3001/api/v1 \
K6_PHONE=5xxxxxxxxx \
K6_PASSWORD='YourStrongPassword123!' \
K6_ORDER_CUSTOMER_ID=1 \
K6_ORDER_PRODUCT_ID=1 \
K6_ORDER_QUANTITY=1 \
K6_ORDER_PRICE_CENTS=1000 \
k6 run scripts/loadtest/k6-api-smoke.js
```

## Stock Update Scenario (admin/staff auth required)

```bash
K6_BASE_URL=http://localhost:3001/api/v1 \
K6_PHONE=5xxxxxxxxx \
K6_PASSWORD='YourStrongPassword123!' \
K6_STOCK_PRODUCT_ID=1 \
K6_STOCK_TARGET=50 \
k6 run scripts/loadtest/k6-api-smoke.js
```

## Tunables

- `K6_VUS` (default: `10`)
- `K6_DURATION` (default: `1m`)
- `K6_SEARCH_QUERY` (default: `piano`)
- `K6_SEARCH_PAGE_SIZE` (default: `20`)
- `K6_STOCK_PRODUCT_ID` (default: `0`, disabled)
- `K6_STOCK_TARGET` (default: `-1`, disabled)

## Notes

- The script handles CSRF token flow before unsafe requests.
- For stable results, run against staging with representative data.


---

## Source: BACKUP.md

# PostgreSQL Backup Guide

This guide covers local/remote backup and restore for Nutopiano PostgreSQL.

## Scripts

- Linux/macOS: `scripts/backup-postgres.sh`
- Windows: `scripts/backup-postgres.ps1`

## Required Environment

- `DATABASE_URL`

Optional:

- `BACKUP_DIR` (default Linux: `/var/backups/nutopiano/postgres`)
- `BACKUP_RETENTION_DAYS` (default: `14`)
- `BACKUP_PREFIX` (default: `nutopiano`)

## Run Backup (Linux)

```bash
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
export BACKUP_DIR="/var/backups/nutopiano/postgres"
export BACKUP_RETENTION_DAYS=14
bash scripts/backup-postgres.sh
```

## Run Backup (Windows PowerShell)

```powershell
.\scripts\backup-postgres.ps1 `
  -DatabaseUrl "postgresql://user:pass@host:5432/dbname" `
  -BackupDir "C:\backups\nutopiano\postgres" `
  -RetentionDays 14
```

## Restore

Backup files are generated as `*.dump.gz`. To restore:

```bash
gunzip -c /path/to/nutopiano_YYYYMMDD_HHMMSS.dump.gz > /tmp/restore.dump
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="postgresql://user:pass@host:5432/dbname" \
  /tmp/restore.dump
```

## Cron Example (Daily at 03:00)

```cron
0 3 * * * DATABASE_URL="postgresql://user:pass@host:5432/dbname" BACKUP_DIR="/var/backups/nutopiano/postgres" BACKUP_RETENTION_DAYS=14 /bin/bash /var/www/nutopiano_app/scripts/backup-postgres.sh >> /var/log/nutopiano-backup.log 2>&1
```

## Notes

- Use separate backup paths for production and staging.
- Test restore procedure regularly.
- Keep offsite copy (object storage or secondary server) for disaster recovery.


---

## Source: backend\\README.md

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Authorization Helpers

Barrel exports are available for core decorators and guards:

```ts
import { AdminOrStaffSelf, Roles } from './core/decorators';
import { JwtAuthGuard, RolesGuard, StaffSelfGuard } from './core/guards';
```

### AdminOrStaffSelf usage

Use this decorator to allow ADMIN access or USER access to their own resource.
Not: Decorator/guard isimlerinde geriye donuk uyumluluk nedeniyle "staff" ifadesi gecse de
aktif rol modeli `USER` uzerinden calisir.

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  @Roles('ADMIN')
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @AdminOrStaffSelf({ type: 'id', param: 'id' })
  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @AdminOrStaffSelf({ type: 'phone', param: 'phone' })
  @Get('by-phone/:phone')
  findByPhone(@Param('phone') phone: string) {
    return this.usersService.findByPhone(phone);
  }
}
```

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).



---

## Source: frontend\\README.md

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


---

## Source: 4.7.md

# 🎹 Nutopiano — Sistem Mimarisi ve Çalışma Mantığı

> **Bu doküman, projeyi hiç bilmeyen biri için yazılmıştır.** Teknik terimler mümkün olduğunca sade bir dille açıklanmaktadır.

---

## 📌 Projenin Genel Amacı

**Nutopiano**, bir e-ticaret platformudur. Müşteriler ürünleri görüntüleyip satın alabilir, yöneticiler (admin) ürün, kategori, sipariş ve müşterileri yönetebilir. Satıcılar (seller) kendi profillerine sahip olabilir ve komisyon alabilir. Sistem ayrıca randevu (appointment) ve POS (kasa) özelliklerine de sahiptir.

---

## 🏗️ Projenin Genel Yapısı (2 Ana Parça)

Proje iki büyük klasörden oluşur:

```
Nutopiano/
├── backend/     ← Sunucu tarafı (API, veritabanı işlemleri)
└── frontend/    ← Kullanıcı arayüzü (Web sitesi)
```

Bunlar birbirinden tamamen ayrı programlardır ve birbirleriyle **HTTP istekleri (API çağrıları)** aracılığıyla konuşurlar.

---

## ⚙️ BACKEND — Sunucu Tarafı

### Teknoloji Nedir?

Backend **NestJS** ile yazılmıştır. NestJS, Node.js üzerinde çalışan ve büyük projeleri modüler (parça parça) yazmaya yarayan bir framework'tür. TypeScript kullanılmaktadır (JavaScript'in tip güvenli hali).

### Veritabanı Nedir?

**PostgreSQL** kullanılmaktadır. Veritabanıyla konuşmak için **Prisma ORM** kullanılır. Prisma, veritabanı tablolarını TypeScript kodu gibi kullanmamızı sağlar; SQL yazmamıza gerek kalmaz.

Backend **Port 3001**'de çalışır. Tüm API adresleri `/api/` ile başlar (örnek: `http://localhost:3001/api/auth/login`).

---

### 📂 Backend Dosya Yapısı

```
backend/src/
├── main.ts              ← Sunucuyu başlatan ana dosya
├── app.module.ts        ← Tüm modüllerin toplandığı merkez
├── auth/                ← Kimlik doğrulama (giriş, kayıt, token)
├── database/            ← Prisma veritabanı bağlantısı
├── email/               ← E-posta gönderimi
├── common/              ← Ortak yardımcı araçlar
│   ├── config/          ← Uygulama ayarları (CORS, JWT vs.)
│   ├── guards/          ← Erişim kontrolleri (kim neye erişebilir?)
│   ├── interceptors/    ← İstek/yanıt işleyicileri
│   ├── middleware/       ← CSRF güvenlik katmanı
│   └── utils/           ← Sayfalama ve yardımcı fonksiyonlar
└── modules/             ← İş mantığı modülleri
    ├── appointments/    ← Randevular
    ├── categories/      ← Ürün kategorileri
    ├── customers/       ← Müşteriler
    ├── dashboard/       ← Yönetim paneli istatistikleri
    ├── finance/         ← Komisyon ve ödemeler
    ├── marketplace/     ← Genel ürün arama (public)
    ├── order-status/    ← Sipariş durumları
    ├── orders/          ← Siparişler
    ├── plans/           ← Abonelik planları
    ├── products/        ← Ürünler
    ├── sellers/         ← Satıcı profilleri
    ├── settings/        ← İşletme ayarları
    ├── uploads/         ← Dosya/resim yükleme
    └── users/           ← Kullanıcılar
```

---

### 🗄️ Veritabanı Modelleri (Tablolar)

Prisma şemasında tanımlı tablolar ve aralarındaki ilişkiler:

#### `Business` (İşletme)
Her şey bir işletmeye bağlıdır. Bu sistem **multi-tenant** (çok kiracılı) olacak şekilde tasarlanmıştır — yani birden fazla işletme aynı sistem üzerinde çalışabilir. Şu an genellikle tek bir işletme (`businessId = 1`) kullanılmaktadır.

#### `User` (Kullanıcı)
Sisteme giriş yapan kişiler. 3 rolü vardır:
- `ADMIN` → Her şeye erişebilir, yönetici
- `STAFF` → Personel, sınırlı yetki
- `CUSTOMER` → Normal müşteri

#### `Customer` (Müşteri Kaydı)
`User`dan farklıdır! Bir kullanıcı (`User`) sistem hesabıdır. Bir müşteri (`Customer`) ise sipariş verebilen, bakiye tutan kişidir. İkisi **telefon numarasıyla** birbirine bağlanabilir (`userId` alanı).

#### `Product` (Ürün)
Satılan ürünler. Fiyat **kuruş cinsinden** saklanır (örn: 10₺ → `priceCents = 1000`). Türleri: `PHYSICAL`, `SERVICE`, `WEIGHT`, `CUSTOM`.

#### `Category` (Kategori)
Ürünlerin sınıflandırıldığı kategoriler. **Alt kategoriler** desteklenir (`parentId` alanı).

#### `Order` (Sipariş)
Müşterinin verdiği sipariş. Nereden geldiğini (`source`) tutar: `POS`, `MOBILE`, `WEB`, `API`.

#### `OrderItem` (Sipariş Kalemi)
Bir siparişin içindeki her ürün kalemi.

#### `Payment` (Ödeme)
Sipariş için yapılan ödemeler. Yöntemler: `CASH`, `CARD`, `TRANSFER`, `OTHER`.

#### `OrderStatus` (Sipariş Durumu)
Siparişin hangi aşamada olduğunu gösterir. Her işletme kendi durumlarını tanımlayabilir.

#### `RefreshToken` (Yenileme Token'ı)
Güvenli oturum yönetimi için kullanılır (aşağıda detaylı açıklanacak).

#### `Seller` (Satıcı Profili)
`ADMIN` veya `STAFF` kullanıcıların herkese açık satıcı sayfası.

#### `Appointment` (Randevu)
Müşterilerle yapılan randevular. Statüler: `SCHEDULED`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`.

---

## 🔐 KİMLİK DOĞRULAMA SİSTEMİ (Auth)

Bu projenin en kritik parçası. **JWT (JSON Web Token)** kullanılır. Bunu bir kapı kartı sistemi gibi düşünebilirsiniz.

### Giriş Akışı (Login)

```
Kullanıcı → [telefon+şifre gönderir] → Backend API
Backend → Şifreyi kontrol eder (bcrypt ile)
Backend → 2 tane token (kart) üretir:
   1. Access Token  → Kısa ömürlü (15 dakika), hızlı doğrulama için
   2. Refresh Token → Uzun ömürlü (7 gün), yeni access token almak için
Backend → Bu token'ları HTTP-only Cookie olarak tarayıcıya gönderir
```

### Neden Cookie?

Güvenlik için. `httpOnly: true` olan bir cookie, JavaScript tarafından okunamaz. Bu XSS (siteler arası script) saldırılarına karşı koruma sağlar.

### Token Döngüsü (Rotation)

Access token 15 dakikada bir sona erer. Kullanıcı bunu fark etmeden, frontend otomatik olarak `/api/auth/refresh` endpoint'ine gider ve yeni bir access token alır. Bu sırada eski refresh token silinir (revoke), yerine yeni biri oluşturulur (rotation).

**Güvenlik özelliği:** Eğer birisi çalınan bir refresh token'ı kullanmaya çalışırsa (revoke edilen bir token), sistem bunu "token yeniden kullanımı = ele geçirilme girişimi" olarak değerlendirir ve o kullanıcının **tüm** oturumlarını kapatır.

### Kayıt (Register)

Yeni kullanıcılar `CUSTOMER` rolüyle oluşturulur. İsim, telefon, e-posta ve şifre gereklidir. Şifre veritabanına **bcrypt** ile hash'lenerek kaydedilir (yani şifre ham olarak saklanmaz).

### Şifre Sıfırlama

1. Kullanıcı e-posta gönderir → `/api/auth/forgot-password`
2. Backend, süresi 30 dakika olan bir token üretir ve hash'ini veritabanına kaydeder
3. Kullanıcıya e-posta ile link gönderilir
4. Kullanıcı linke tıklar → `/reset-password?token=...` sayfasına gelir
5. Yeni şifre girilir → `/api/auth/reset-password` isteği atılır

---

## 🛡️ GÜVENLİK KATMANLARI

### 1. CSRF Koruması

`csurf` kütüphanesiyle sağlanır. Her oturumda bir `__csrf` cookie'si üretilir. Frontend, POST/PUT/DELETE isteklerinde bu token'ı `X-CSRF-Token` header olarak gönderir. Böylece başka sitelerden yapılan sahte istekler (CSRF saldırısı) engellenir.

### 2. Rate Limiting (İstek Sınırlandırma)

`ThrottlerModule` ile yapılandırılmıştır:
- **Genel:** Dakikada en fazla 60 istek
- **Auth (giriş) endpoint'leri:** 15 dakikada en fazla 5 istek (brute-force koruması)

### 3. CORS

Sadece `.env` dosyasında tanımlı origin'lerden gelen istekler kabul edilir. Üretimde `*` (herkese açık) kullanılamaz.

### 4. Roles Guard (Rol Kontrolü)

Her endpoint hangi rollerin erişebileceğini `@Roles()` decorator'ıyla tanımlar. `RolesGuard` her istekte kullanıcının rolünü kontrol eder.

---

## 🌐 FRONTEND — Kullanıcı Arayüzü

### Teknoloji Nedir?

Frontend **Next.js 14** (App Router) ile yazılmıştır. TypeScript ve React kullanılmaktadır.

Frontend **Port 3000** (veya 3002) üzerinde çalışır.

---

### 📂 Frontend Dosya Yapısı

```
frontend/src/
├── app/                 ← Next.js sayfaları (her klasör bir URL)
│   ├── page.tsx         ← Ana sayfa (/)
│   ├── layout.tsx       ← Tüm sayfalara ortak iskelet (header, footer)
│   ├── providers.tsx    ← Global state sağlayıcıları
│   ├── login/           ← Giriş sayfası
│   ├── register/        ← Kayıt sayfası
│   ├── cart/            ← Sepet sayfası
│   ├── checkout/        ← Ödeme sayfası
│   ├── products/        ← Ürün listesi
│   ├── categories/      ← Kategori listesi
│   ├── account/         ← Hesap sayfaları (korumalı)
│   ├── dashboard/       ← Yönetici paneli (korumalı)
│   ├── platform/        ← Platform yönetimi (korumalı)
│   ├── admin/           ← Admin sayfaları
│   └── pos/             ← POS (kasa) modülü (korumalı)
├── components/          ← Tekrar kullanılan UI bileşenleri
│   ├── Header.tsx       ← Üst menü bar
│   ├── ProductCard.tsx  ← Ürün kartı
│   ├── CategoryTile.tsx ← Kategori kutucuğu
│   ├── layout/          ← Alt menü bar, mobil navigasyon
│   ├── common/          ← Button, Input, Spinner vs.
│   ├── admin/           ← Admin koruma bileşenleri
│   ├── seller/          ← Satıcı koruma bileşenleri
│   └── checkout/        ← Ödeme stepper'ı
├── store/               ← Redux (global state yönetimi)
│   ├── index.ts         ← Store yapılandırması
│   ├── cartSlice.ts     ← Sepet state'i
│   └── userSlice.ts     ← Kullanıcı state'i
├── services/
│   └── api.ts           ← Backend ile iletişim (Axios)
├── hooks/               ← Tekrar kullanılan React hook'ları
├── utils/               ← Yardımcı fonksiyonlar
├── constants/           ← Sabit değerler
└── middleware.ts         ← Sayfa erişim koruması (Next.js Middleware)
```

---

### 🔄 Global State Yönetimi (Redux)

Uygulama genelinde iki tür veri tutulur:

#### `cartSlice` — Sepet
Kullanıcının sepeti **tarayıcının localStorage**'ında (yerel depolama) saklanır. Bu sayede sayfa yenilense bile sepet kaybolmaz.

Sepet işlemleri:
- `addItem` → Ürün ekle
- `removeItem` → Ürün çıkar  
- `updateQuantity` → Adet güncelle
- `clearCart` → Sepeti temizle
- `hydrateCart` → Sayfa açılışında localStorage'dan yükle

#### `userSlice` — Kullanıcı
Giriş yapmış kullanıcının bilgilerini tutar. Statüler:
- `idle` → Giriş yapılmamış
- `authenticating` → Giriş işlemi sürüyor
- `authenticated` → Giriş yapılmış
- `error` → Hata oluştu

---

### 🔌 API İletişimi (api.ts)

Frontend, backend ile `Axios` kütüphanesi aracılığıyla konuşur. `api.ts` dosyasında iki önemli **interceptor** (araya giren işleyici) vardır:

#### Request Interceptor (İstek yakalyıcı)
POST, PUT, PATCH, DELETE gibi "tehlikeli" isteklere otomatik olarak `X-CSRF-Token` header'ı eklenir. Token, tarayıcıdaki `__csrf` cookie'sinden okunur.

#### Response Interceptor (Yanıt yakalayıcı)
Backend her başarılı yanıtı şu formatta döndürür:
```json
{ "success": true, "data": {...}, "message": null }
```
Bu interceptor, dış kabuğu soyarak sadece `data` kısmını döndürür. Böylece kod her yerde `response.data.data` yerine `response.data` yazabilir.

---

### 🔒 Sayfa Erişim Koruması (middleware.ts)

Next.js **Middleware** katmanı, belirli sayfaları korur. Bir kullanıcı giriş yapmadan şu sayfaları açmaya çalışırsa otomatik olarak `/login?next=...` adresine yönlendirilir:

- `/account/*` → Hesap sayfaları
- `/platform/*` → Platform yönetimi  
- `/seller/*` → Satıcı paneli
- `/dashboard/*` → Yönetim paneli
- `/pos/*` → POS modülü

Token kontrolü `nutopiano_access` cookie'sine bakılarak yapılır. **Not:** Bu yalnızca varlık kontrolüdür; token geçerliliği backend tarafından doğrulanır.

---

### 📄 Sayfalar ve Akışlar

#### Ana Sayfa (`/`)
- `HomeClient.tsx` bileşeniyle çalışır
- Hero slider (6 saniyede bir otomatik geçiş yapan banner) gösterir
- Backend'den öne çıkan ürünleri (`/api/products?featured=true`) ve kategorileri (`/api/public/categories`) çeker
- **React Query** ile veri çekme yapılır (cache, loading ve error state'leri otomatik yönetilir)
- Ekran boyutuna göre 2/3/4 ürün gösterir

#### Sepet Sayfası (`/cart`)
- Redux'tan sepet verilerini okur (API çağrısı yok!)
- Adet güncelleme, ürün silme, sepeti temizleme işlemleri Redux aksiyonlarını tetikler
- Değişiklikler otomatik olarak localStorage'a kaydedilir

#### Ödeme Sayfası (`/checkout`)
1. Kullanıcı giriş yapmamışsa `/login` sayfasına yönlendirilir
2. Giriş yapılmışsa `/api/customers/me` endpoint'inden müşteri kaydı alınır (veya otomatik oluşturulur)
3. Müşteri kaydı bulunursa sipariş formu gösterilir
4. "Siparişi oluştur" denenince `/api/orders` endpoint'ine POST isteği gönderilir
5. Sipariş başarıyla oluşturulursa sepet temizlenir ve başarı ekranı gösterilir

#### Oturum Yönetimi (Header.tsx)
Header bileşeni:
- Redux'taki kullanıcı state'ini okur
- Giriş yapılmışsa kullanıcı menüsü gösterir (Profil, Siparişlerim, Favorilerim vs.)
- Sepet ikonunda ürün sayısını gösterir
- Çıkış yapıldığında `/api/auth/logout` çağrılır (cookie'ler temizlenir) ve Redux state sıfırlanır

---

## 🔗 KULLANICI — MÜŞTERİ BAĞLANTISI

Bu sistemin en ilginç tasarım kararlarından biri:

**Sorun:** Sistem hem "kullanıcı hesabı" (`User`) hem de "müşteri kaydı" (`Customer`) kavramına sahip. Bunlar başlangıçta ayrıdır.

**Çözüm (`findOrCreateForUser` fonksiyonu):**
Bir müşteri sepetten ödeme sayfasına geçtiğinde `/api/customers/me` çağrılır. Bu endpoint:

1. Kullanıcının `userId`'ine bağlı müşteri kaydı var mı? → Varsa onu döndür
2. Yoksa kullanıcının telefon numarasıyla eşleşen müşteri kaydı var mı?
   - **Varsa ve bağlantısız:** O kaydı bu kullanıcıya bağla (link et)
   - **Varsa ama başka kullanıcıya bağlı:** Hata döndür
3. Hiç kayıt yoksa: Yeni müşteri kaydı oluştur ve kullanıcıyla bağla

Bu sayede mağazada daha önce manuel olarak oluşturulan müşteri kayıtları, o müşteri online hesap açtığında otomatik olarak birleşir.

---

## 📦 SİPARİŞ OLUŞTURMA AKIŞI

Bir siparişin oluşturulması şu adımlardan geçer:

```
1. Frontend → POST /api/orders gönderir (customerId, items listesi)
2. Backend → Müşteri kaydını doğrular
3. Backend → Varsayılan sipariş durumunu ayardan okur (genellikle "CREATED")
4. Backend → Her ürünün aktif ve stokta olduğunu kontrol eder
5. Backend → Transaction başlatır (tüm adımlar atomik):
   a. Stok tekrar kontrol edilir (race condition önlemi)
   b. Her ürünün stoğu düşürülür
   c. Sipariş kaydı oluşturulur
   d. Sipariş kalemleri oluşturulur
6. Backend → Başarılı yanıt döndürür
7. Frontend → Sepeti temizler, başarı ekranı gösterir
```

---

## 💰 FİNANSAL SİSTEM

### Komisyon (Commission)
Bir sipariş "final" (son) statüye geçtiğinde, siparişi oluşturan personel/satıcı için otomatik olarak komisyon kaydı oluşturulur. Komisyon oranı ayarlardan okunur.

### Payout (Ödeme Talebi)
Satıcılar birikmiş komisyon tutarları için ödeme talebi oluşturabilir. Talepler `pending → approved → completed` akışını izler.

---

## 📮 E-POSTA SİSTEMİ

`EmailService` sınıfı Nodemailer kullanır. Konfigürasyon `.env` dosyasından okunur:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

Eğer SMTP ayarları eksikse (geliştirme ortamı), e-posta gönderilmez ama konsola loglanır. Bu, geliştirme sırasında e-posta sunucusuna ihtiyaç duymamayı sağlar.

Şu an yalnızca **şifre sıfırlama e-postası** gönderilmektedir.

---

## 🚀 ÇALIŞMA ORTAMLARI

### Geliştirme Ortamı (Development)

```bash
# Backend başlatmak için:
npm run dev:backend   # port 3001'de çalışır

# Frontend başlatmak için:
npm run dev:frontend  # port 3000'de çalışır
```

### Üretim Ortamı (Production)

**PM2** process manager kullanılır. `ecosystem.config.cjs` dosyasında iki process tanımlıdır:
- `nutopiano-api` → Backend
- `nutopiano-web` → Frontend

---

## 🔑 ORTAM DEĞİŞKENLERİ (.env)

Backend için kritik değişkenler:

| Değişken | Açıklama |
|----------|----------|
| `DATABASE_URL` | PostgreSQL bağlantı adresi |
| `JWT_SECRET` | Token imzalamak için gizli anahtar |
| `ALLOWED_ORIGINS` | CORS için izinli adresler |
| `PUBLIC_BUSINESS_ID` | Genel mağazanın işletme ID'si |
| `SMTP_HOST/USER/PASS` | E-posta sunucu bilgileri |
| `PORT` | Backend port (varsayılan: 3001) |

---

## 📡 API DOKÜMANTASYONU

Backend **Swagger** ile otomatik dokümantasyon üretir. Geliştirme ortamında `http://localhost:3001/docs` adresinden erişilebilir. Tüm endpoint'ler, parametre ve yanıt tipleri burada görüntülenebilir.

---

## 🗺️ SİSTEM AKIŞ DİYAGRAMI (Özet)

```
Tarayıcı
   │
   ├── Next.js Middleware → Korumalı sayfa mı? → Cookie var mı? → Yoksa /login'e yönlendir
   │
   ├── React + Redux → Sepet (localStorage) + Kullanıcı (memory)
   │
   └── Axios (api.ts)
         │
         ├── Request Interceptor → CSRF token ekle
         │
         └── [HTTP] → NestJS Backend (port 3001)
                          │
                          ├── CSRF Middleware → Token doğrula
                          ├── JWT Guard → Token geçerli mi?
                          ├── Roles Guard → Yetki var mı?
                          └── Module Service → Prisma → PostgreSQL
```

---

---

# ⚠️ GELECEKTE SORUN ÇIKARABİLECEK ALANLAR

Aşağıdaki liste, sistemin mevcut koduna bakılarak tespit edilen potansiyel risk noktalarıdır. Her madde bağımsız bir sorundur.

---

### 1. 🔐 Middleware Sadece Cookie Varlığını Kontrol Eder, Geçerliliğini Değil

**Dosya:** `frontend/src/middleware.ts`

```typescript
const token = req.cookies.get(ACCESS_COOKIE)?.value;
if (token && token.trim().length > 0) {
  return NextResponse.next(); // ← Sadece var mı diye bakılıyor!
}
```

Cookie var ama süresi dolmuş veya sahte olabilir. Kullanıcı sahte bir cookie ile korumalı sayfalara erişmeye çalışabilir. Gerçek doğrulama ilk API çağrısına kadar yapılmaz.

**Çözüm:** Middleware'de token'ı `jose` gibi bir kütüphaneyle Edge Runtime'da doğrulamak.

---

### 2. 📦 Stok Azaltma Transaction'ı Gerçek Lock Kullanmıyor

**Dosya:** `backend/src/modules/orders/orders.service.ts`

```typescript
// İlk kontrol (transaction dışı)
for (const item of payload.items) {
  if (product.stock < item.quantity) throw error;
}

// Transaction içinde tekrar kontrol ve azaltma
await tx.product.update({ data: { stock: { decrement: item.quantity } } });
```

Prisma'nın `$transaction` kullanılıyor ama PostgreSQL'de gerçek satır kilidi (`SELECT FOR UPDATE`) uygulanmıyor. Aynı anda çok sayıda sipariş gelirse stok negatife düşebilir (overselling).

**Çözüm:** Raw SQL ile `SELECT ... FOR UPDATE NOWAIT` kullanmak.

---

### 3. 👥 CUSTOMER Siparişleri userId yerine Phone ile Bulunuyor

**Dosya:** `backend/src/modules/orders/orders.service.ts`

```typescript
if (currentUser.role === 'CUSTOMER') {
  const phone = currentUser.phone?.trim();
  const customer = await this.prisma.customer.findFirst({
    where: { businessId, phone }, // ← Phone ile arama
  });
}
```

Kullanıcının telefon numarası değişirse siparişlerine erişim kesilir. Ayrıca `findOrCreateForUser` ile müşteri kaydı link edilmiş olabilir ama orders servisinde bu link (`userId`) kullanılmıyor.

**Çözüm:** Önce `userId` ile müşteri ara, bulamazsan phone ile yedek ara.

---

### 4. 💰 Fiyat Hesabı Client Tarafında Yapılıyor

**Dosya:** `frontend/src/store/cartSlice.ts`

```typescript
state.totalPrice += item.price * quantity;
```

Sepetteki fiyatlar tarayıcı tarafında hesaplanıyor. Kötü niyetli bir kullanıcı tarayıcı developer tools'u ile Redux state'ini değiştirebilir. Backend sipariş oluştururken fiyatı `product.priceCents` değerinden alıyor — bu doğru. Ama checkout ekranındaki "toplam" bilgisi güvenilir değil.

**Çözüm:** Checkout sayfasında backend'den anlık fiyat özeti çekmek.

---

### 5. 🔄 Refresh Token Sonsuz Döngü Riski

**Dosya:** `frontend/src/services/api.ts`

API servisinde access token dolduğunda otomatik refresh yapılmıyor. Şu an kullanıcı 401 alınca muhtemelen giriş sayfasına düşüyor. Eğer ileride otomatik refresh eklenirse ve yanlış implement edilirse sonsuz döngüye girebilir (refresh token alındıktan sonra yine 401, tekrar refresh...).

**Çözüm:** Refresh interceptor eklerken `_retry` flag kullanmak ve refresh endpoint'ini interceptor dışında tutmak.

---

### 6. 📧 SMTP Yapılandırılmamışsa E-posta Sessizce Başarısız Olur

**Dosya:** `backend/src/email/email.service.ts`

```typescript
if (!host || !user || !pass) {
  console.warn('SMTP is not configured...');
  // Stream transport kullanılıyor ama e-posta kullanıcıya ulaşmıyor
}
```

Şifre sıfırlama isteği başarılı döner ama e-posta gitmez. Kullanıcı "neden e-posta gelmedi" diye hatalı rapor açar.

**Çözüm:** Üretim ortamında SMTP yoksa hata fırlat veya en azından açıkça log yaz.

---

### 7. 🏢 Multi-Tenant Mimari Yarım Kalmış

**Birden fazla business** destekleyecek şekilde tasarlanmış ama frontend tamamen `PUBLIC_BUSINESS_ID` = 1 varsayımıyla çalışıyor. Frontend'de business seçimi veya subdomain yönlendirmesi yok.

**Risk:** Sisteme ikinci bir işletme eklense bile frontend hep aynı işletmeyi gösterir.

---

### 8. 🎭 Rol Sistemi Tutarsız

**Dosya:** `backend/src/common/guards/roles.guard.ts`

```typescript
if (role === 'ADMIN') {
  // Legacy "ADMIN" should authorize both platform admin and seller/business admin.
  expanded.add(ROLES.SUPER_ADMIN);
  expanded.add(ROLES.SELLER);
}
```

Veritabanındaki `Role` enum'u `ADMIN`, `STAFF`, `CUSTOMER` şeklindeyken, `roles.guard.ts`'de `SUPER_ADMIN` ve `SELLER` gibi yeni roller tanımlanmış. Bu ikisi tam senkronize değil. Hangi endpoint'in hangi rolü kabul ettiğini takip etmek zorlaşıyor.

---

### 9. 📄 Sayfalama Yanlış Kullanım Durumu

**Dosya:** `backend/src/modules/marketplace/marketplace.service.ts`

```typescript
// İlk önce sayfa 1 için sorgu yapılıyor
// Eğer istenen sayfa farklıysa ikinci kez sorgu yapılıyor
if (meta.page !== page) {
  const corrected = await this.productsService.searchProducts({...});
}
```

Aynı isteği iki kez database'e sorması performans sorunudur. Çok sayıda kullanıcı aynı anda farklı sayfa talep ederse veritabanı yükü gereksiz artar.

---

### 10. 🗑️ Soft Delete Mekanizması Yok

Ürünler ve kategoriler `isActive` alanıyla pasif hale getirilebiliyor (`archivedAt` alanı da var). Ancak müşteri veya sipariş kayıtları gerçekten silinebiliyor (`customer.delete()`). Müşteri silinirse siparişler sahipsiz kalır veya hata verir.

**Çözüm:** Tüm kritik modeller için gerçek silme yerine `deletedAt` timestamp'i ile soft delete uygulamak.

---

### 11. 🔑 `lineId` Sepet Tutarsızlığı

**Dosya:** `frontend/src/store/cartSlice.ts`

Sepette ürünlerin tekil kimliği `lineId` ile tanımlanıyor ama `lineId`'nin nasıl üretildiği `cartSlice` içinde tanımlı değil. Her ürün eklenirken dışarıdan `lineId` verilmesi gerekiyor. Bu tutarsız kullanılırsa aynı ürün birden fazla kayıt olarak eklenerek `addItem` içindeki "varsa ekle" mantığı çalışmayabilir.

---

### 12. 📱 Tek Sunucu — Ölçekleme Sorunu

Dosya yükleme (`uploads/`) ve local disk kullanılıyor. Birden fazla sunucuya (horizontal scaling) geçilirse her sunucunun kendi disk'i olacağından yüklenmiş dosyalara ulaşılamayabilir.

**Çözüm:** S3 veya benzeri cloud storage servisine geçilmesi gerekir.

---

### 13. 🔁 Sipariş Oluşturmada Idempotency (Tekrar Koruması) Yok

**Dosya:** `frontend/src/app/checkout/page.tsx` + `backend/src/modules/orders/orders.service.ts`

Kullanıcı "Siparişi Onayla" butonuna iki kez hızlıca basarsa veya ağ gecikmesi nedeniyle frontend isteği tekrar gönderirse **iki ayrı sipariş oluşur**. Frontend'de `isSubmitting` flag'i var ama bu sadece UI engelidir; backend'de herhangi bir tekrar koruması yoktur.

```
1. Kullanıcı butona basar → isSubmitting = true → istek gönderilir
2. Ağ yavaş → buton hâlâ aktif görünür → kullanıcı tekrar basar
3. İkinci istek de geçer → 2 sipariş oluşur
```

**Çözüm:** Frontend'de her checkout oturumu için benzersiz bir `Idempotency-Key` header'ı üret (UUID). Backend'de bu key'i kısa süreli cache'le (Redis veya DB unique constraint). Aynı key ile gelen ikinci istek daha önceki yanıtı döndürsün.

---

### 14. 🏃 `findOrCreateForUser` Race Condition (Yarış Koşulu)

**Dosya:** `backend/src/modules/customers/customers.service.ts`

```typescript
// 1. Müşteri var mı diye bak
let customer = await this.prisma.customer.findUnique({ where: { userId } });

// ← BURADA BİR BAŞKA İSTEK GELEBİLİR!

// 2. Yoksa oluştur
customer = await this.prisma.customer.create({ data: { ... } });
```

Aynı anda iki farklı istek gelirse (örneğin checkout açılışı ile profile açılışı eş zamanlı), ikisi de "müşteri yok" görür ve iki ayrı kayıt oluşturmaya çalışır. `userId` üzerinde unique constraint olduğu için ikincisi hata verir — ama bu hata kullanıcıya çirkin bir 500 hatası olarak görünür.

**Çözüm:** PostgreSQL `INSERT ... ON CONFLICT (userId) DO NOTHING RETURNING *` ile tek sorguda hem oluştur hem de duplicate'i engelle. Ya da `$transaction` içinde `findUnique` + `upsert` kullan.

---

### 15. 🗝️ JWT Tek Secret Kullanıyor — Key Rotation Yok

**Dosya:** `backend/src/auth/auth.service.ts` + `.env`

```typescript
return this.jwtService.sign(payload, { expiresIn: '15m' });
// JwtService, tek bir JWT_SECRET kullanıyor
```

`JWT_SECRET` sızarsa saldırgan sınırsız geçerli token üretebilir. Bunu fark etmek için hiçbir mekanizma yok çünkü:
- Hangi token'ın hangi "key versiyonu" ile imzalandığı kaydedilmiyor (`kid` claim yok)
- Secret değiştirilirse tüm aktif kullanıcılar anında oturumdan çıkar (hizmet kesintisi)
- Eski ve yeni secret'ı aynı anda desteklemenin yolu yok

**Çözüm:** JWT payload'ına `kid` (key ID) claim'i ekle. Birden fazla secret destekleyen bir key store yap. Böylece eski key'le imzalanan token'lar geçerliliğini korurken yeni token'lar yeni key ile imzalanır.

---

### 16. 🚀 Caching Katmanı Hiç Yok

**Etkilenen endpoint'ler:** `/api/public/categories`, `/api/products?featured=true`, `/api/marketplace/search`

Bu endpoint'ler sık değişmeyen veriler döndürüyor ama her istek için PostgreSQL'e tam sorgu atılıyor. 1000 kullanıcı aynı anda ana sayfayı açarsa 1000 ayrı veritabanı sorgusu tetiklenir.

```
100 kullanıcı/saniye × 3 sorgu/sayfa = 300 DB sorgusu/saniye
→ PostgreSQL connection pool tüketilir → timeout hataları başlar
```

**Çözüm:** Redis ile response cache katmanı. Kategori listesi 5 dakika, featured ürünler 2 dakika cache'lenebilir. NestJS'in `CacheModule` veya `cache-manager` büyük değişiklik gerektirmez.

---

### 17. 📬 Sipariş Sonrası Bildirim Sistemi Yok

**Dosya:** `backend/src/email/email.service.ts`

`EmailService` altyapısı var ama sadece şifre sıfırlama için kullanılıyor. Sipariş oluşturulunca, sipariş durumu değişince, ödeme alınınca müşteriye hiçbir şey gönderilmiyor.

| Olay | Mevcut Durum | Olması Gereken |
|------|-------------|----------------|
| Sipariş oluşturuldu | ❌ Bildirim yok | ✅ "Siparişiniz alındı" e-postası |
| Sipariş durumu değişti | ❌ Bildirim yok | ✅ "Siparişiniz kargoya verildi" e-postası |
| Sipariş iptal edildi | ❌ Bildirim yok | ✅ "İptal onayı" e-postası |

**Çözüm:** `OrdersService.create()` ve `OrdersService.update()` içinde `EmailService` çağrıları ekle. Daha temiz bir çözüm için event-driven mimari (aşağıda açıklanıyor).

---

### 18. 🔢 API Versiyonlaması Yok

**Dosya:** `backend/src/main.ts`

```typescript
app.setGlobalPrefix('api'); // → /api/orders, /api/products
```

Tüm endpoint'ler `/api/` altında düz. İleride mobil uygulama veya üçüncü taraf entegrasyon geldiğinde:
- Mevcut endpoint'lerde breaking change yapman gerekirse
- Hem eski hem yeni istemciyi desteklemen gerekirse
- `/api/v1/` ve `/api/v2/` yoksa tüm istemciler aynı anda kırılır

**Çözüm:** `app.setGlobalPrefix('api/v1')` ile versiyonlamayı şimdiden başlat. NestJS'in `@nestjs/common`'dan `ApiVersion` decorator'ı da kullanılabilir.

---

### 19. 🍪 Cookie Güvenlik Flag'leri Production'da Tutarsız

**Dosya:** `backend/src/auth/auth.controller.ts`

```typescript
const buildCookieOptions = (): CookieOptions => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,          // ← Production'da doğru
    sameSite: isProd ? 'none' : 'lax',  // ← 'none' için Secure şart!
    domain: isProd ? '.nutopiano.com' : undefined,
  };
};
```

`sameSite: 'none'` kullanmak için `Secure: true` **zorunludur** (tarayıcı standardı). Bu ikisi zaten birlikte `isProd` kontrolüyle bağlı ama cross-domain deployment senaryolarında (backend ve frontend farklı domainlerde) dikkat edilmezse cookie tarayıcı tarafından **sessizce reddedilebilir**. Özellikle staging veya test ortamlarında `NODE_ENV !== 'production'` iken farklı domain kullanılırsa cookie çalışmaz.

---

### 20. 📋 Audit Log (Denetim Kaydı) Yok

**Kapsam:** Tüm write işlemleri (POST, PUT, PATCH, DELETE)

Kim hangi siparişi ne zaman güncelledi? Hangi admin hangi ürünü fiyatını değiştirdi? Hangi kullanıcı müşteri kaydını sildi? Bu bilgilerin hiçbiri kaydedilmiyor.

Bu bir **hem hukuki hem teknik** sorundur:
- KVKK kapsamında veri işleme faaliyetleri kayıt altına alınmalıdır
- Production hataları debug edilirken "ne oldu" sorusunu cevaplayamazsın
- Fraud (dolandırıcılık) tespiti imkânsız

**Çözüm:** Prisma'nın `$use` middleware'i ile şeffaf audit log:
```typescript
prisma.$use(async (params, next) => {
  const result = await next(params);
  if (['create','update','delete'].includes(params.action)) {
    await auditLog.record({ model: params.model, action: params.action, userId, before, after });
  }
  return result;
});
```

---

### 21. 🔍 Full-Text Search Verimsiz

**Dosya:** `backend/src/modules/marketplace/marketplace.service.ts`

Ürün arama muhtemelen `ILIKE '%query%'` patterni kullanıyor. Bu şu anlama gelir:

```sql
-- Bu sorgu hiçbir index kullanamaz:
WHERE name ILIKE '%piyano%'
-- → PostgreSQL tüm tabloyu okur (sequential scan)
```

Ürün sayısı 10.000'i geçtiğinde her arama sorgusu saniyeler sürebilir.

**Çözüm:** PostgreSQL `pg_trgm` extension ile trigram index (kısa vadeli, kurulumu kolay). Uzun vadede Elasticsearch veya PostgreSQL full-text search (`to_tsvector` + `to_tsquery`).

---

### 22. 💸 Komisyon Hesabında Race Condition

**Dosya:** `backend/src/modules/orders/orders.service.ts`

```typescript
const isFinalNow = Boolean(updated.status?.isFinal);
if (!wasFinal && isFinalNow) {
  await this.financeService.ensureCommissionForFinalOrder({ orderId, ... });
}
```

Eğer aynı sipariş aynı anda iki farklı istek tarafından "final" statüye güncellenmek istenirse (örneğin admin panelinde çift tıklama), iki komisyon kaydı oluşabilir. `Commission` tablosunda `orderId` üzerinde `@unique` var — bu son savunma hattı. Ama bu durumda ikinci işlem çirkin bir unique constraint hatası verir ve sipariş güncellemesi başarısız olarak gözükür.

**Çözüm:** `update` ve `ensureCommission` işlemlerini tek bir veritabanı transaction'ı içine al. Ya da `ensureCommissionForFinalOrder` içinde `upsert` kullan (zaten `@unique` var, bunu avantaja çevir).

---

---

# 🏗️ BEN OLSAM NASIL YAPARDIM — MİMARİ ÖNERİLER

Bu bölüm, mevcut sistemin üzerine inşa edilmesi gereken temel mimari kararları önerir. Bunlar "şu an bozuk" değil, "büyüdükçe şart olacak" konulardır.

---

## 1. ⚡ Event-Driven Sipariş Akışı (BullMQ + Redis)

**Mevcut durum:** Servisler birbirini doğrudan çağırıyor.

```
OrdersService.create()
  → FinanceService.ensureCommission()   ← Doğrudan çağrı
  → EmailService.send()                 ← Doğrudan çağrı (şu an yok)
  → StockService.decrement()            ← Transaction içinde
```

**Sorun:** Bir adım hata verirse tüm sipariş işlemi geri alınıyor. E-posta göndermek başarısız olursa sipariş oluşmaz mı?

**Öneri:** Domain event'leri yayımla, bağımsız handler'lar dinlesin:

```typescript
// Sipariş oluşturulunca:
eventBus.emit('order.created', { orderId, customerId, items, totalAmountCents });

// Bağımsız handler'lar:
OrderCreatedHandler → E-posta gönder
OrderCreatedHandler → Komisyon hesapla
OrderCreatedHandler → Stok düş
OrderCreatedHandler → Dashboard istatistiklerini güncelle
```

**Araç:** BullMQ + Redis. İşlem (job) başarısız olursa otomatik retry yapar. Hangi event'lerin hangi sırada işlendiğini takip edebilirsin.

---

## 2. 📖 CQRS Ayrımı — Marketplace için

**Mevcut durum:** Ürün ekleme (write) ve ürün arama (read) aynı servis ve aynı veritabanına gidiyor.

**Sorun:** Yoğun okuma (marketplace'te binlerce arama) yoğun yazma (sipariş, stok güncelleme) ile aynı PostgreSQL bağlantı havuzunu paylaşıyor.

**Öneri:** Okuma ve yazma taraflarını ayır:
- **Write side:** PostgreSQL (mevcut), tutarlılık kritik
- **Read side:** PostgreSQL read replica veya Redis cache, performans kritik

Marketplace sorguları read replica'ya yönlendirilirse hem ana veritabanının yükü azalır hem de arama sonuçları daha hızlı gelir.

---

## 3. 🔴 Redis — Zorunlu Altyapı Bileşeni

Şu an Redis hiç yok. Ama aşağıdaki 5 sorundan her biri Redis ile çözülebilir:

| Sorun | Redis Çözümü |
|-------|-------------|
| Cache yok (Sorun #16) | Response cache (TTL ile) |
| Rate limit state'i tek sunucuya bağlı | Distributed rate limiting |
| Sepet localStorage'da | Server-side cart (güvenilir, cross-device) |
| Idempotency key yok (Sorun #13) | TTL'li idempotency store |
| Job queue yok | BullMQ queue backend |

Redis eklemek, tek bir altyapı kararıyla 5 farklı sorunu çözer.

---

## 4. 🏢 Multi-Tenant'ı Doğru Otur

**Mevcut durum:** Her servis manuel olarak `businessId = Number(currentUser.businessId)` yapıyor. Bu 50+ yerde tekrarlanan kod ve hata riski.

```typescript
// Şu an her servis fonksiyonunda:
async create(currentUser: JwtPayload, payload: CreateOrderDto) {
  const businessId = Number(currentUser.businessId); // ← Her yerde tekrar
  ...
}
```

**Öneri:** NestJS `REQUEST` scope interceptor ile `businessId`'yi request context'e inject et:

```typescript
// Global interceptor:
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const businessId = Number(req.user?.businessId);
    RequestContext.set('businessId', businessId); // ← Otomatik inject
    return next.handle();
  }
}

// Servisler artık şöyle yazar:
async create(payload: CreateOrderDto) {
  const businessId = RequestContext.get('businessId'); // ← Her üstte tekrar yok
}
```

---

## 5. 📝 Global Audit Log Middleware

Tüm write işlemlerini (POST, PUT, DELETE) otomatik loglamak için bir Prisma middleware yaz. Servis kodlarına dokunmadan, şeffaf şekilde her işlemi kayıt altına alır:

```typescript
// Prisma middleware olarak:
prisma.$use(async (params, next) => {
  const before = /* mevcut veriyi oku */;
  const result = await next(params);
  
  if (['create', 'update', 'delete', 'updateMany', 'deleteMany'].includes(params.action)) {
    await db.auditLog.create({
      data: {
        model: params.model,          // 'Order', 'Product', 'Customer'...
        action: params.action,        // 'update', 'delete'...
        userId: RequestContext.get('userId'),
        businessId: RequestContext.get('businessId'),
        before: JSON.stringify(before),
        after: JSON.stringify(result),
        timestamp: new Date(),
      }
    });
  }
  
  return result;
});
```

Bu yaklaşım sayesinde hiçbir serviste değişiklik yapmadan tüm kritik veri değişiklikleri otomatik olarak kayıt altına alınır.

---

---

# 🕳️ GÖZDEN KAÇAN EK SORUNLAR

---

### 23. 🛒 localStorage Sepetindeki Fiyatlar Hiç Doğrulanmıyor (Stale Cart)

**Dosya:** `frontend/src/store/index.ts` (hydrateCart), `frontend/src/store/cartSlice.ts`

Kullanıcı bir ürünü sepete ekledi, 3 gün bekledi. Bu sürede:
- Ürün fiyatı değişmiş olabilir (indirim bitti, zam yapıldı)
- Ürün pasife alınmış olabilir (`isActive: false`)
- Ürün stoktan çıkmış olabilir

Checkout ekranında kullanıcı **3 gün önceki fiyatı** görür. Backend sipariş oluştururken doğru fiyatı kullandığı için ücretlendirme doğru olur — ama kullanıcıya gösterilen tutar ile tahsil edilen tutar farklı olacağından **"bana gösterilen fiyattan fazla kesildi"** şikayeti kaçınılmaz.

```typescript
// Şu an hydrateCart: localStorage'dan direkt yükle, backend'e sorma
dispatch(hydrateCart(savedCart));
// ← Fiyat doğrulama yok!
```

**Çözüm:** `hydrateCart` çalıştıktan sonra ya da checkout sayfası açılırken `/api/marketplace/products?ids=...` ile mevcut sepet ürünlerinin güncel fiyat ve aktiflik durumunu sorgula. Eski ile yeni fiyat uyuşmuyorsa kullanıcıyı uyar.

---

### 24. 🔑 Şifre Sıfırlamada Eski Token'lar İptal Edilmiyor

**Dosya:** `backend/src/auth/auth.service.ts`

Kullanıcı "şifremi unuttum" formunu 3 kez gönderirse veritabanında **3 adet aktif reset token** birikir. Birincisi kullanılsa bile ikinci ve üçüncü token hâlâ geçerlidir — her biri 30 dakika boyunca çalışır.

```
saldırgan e-postaya erişim sağlarsa:
  → 3 ayrı sıfırlama linki var
  → Kullanıcı şifresini değiştirse bile diğer 2 link hâlâ geçerli
  → Saldırgan tekrar şifre değiştirebilir
```

**Çözüm:** Yeni token üretilmeden önce o kullanıcıya ait tüm önceki `passwordReset` kayıtlarını sil veya `used: true` olarak işaretle:

```typescript
// Yeni token üretmeden önce:
await this.prisma.passwordReset.deleteMany({
  where: { userId: user.id, used: false },
});
// Sonra yeni token oluştur
```

---

### 25. 📱 Telefon Numarası Geri Dönüşümü (Carrier Recycling) — Veri Sızıntısı Riski

**Dosya:** `backend/src/modules/customers/customers.service.ts` → `findOrCreateForUser`

Bu sistemin omurgası telefon numarasıdır. Ancak GSM operatörleri iptal edilen numaraları 3–12 ay sonra başkasına verebilir.

```
Senaryo:
1. Eski müşteri 0555-XXX-XXXX numarasıyla sisteme kayıtlı
   → 10 siparişi, 500₺ bakiyesi, adresleri var
2. Eski müşteri hattı iptal etti
3. Operatör 6 ay sonra aynı numarayı yeni bir kişiye verdi
4. Yeni kişi bu numara ile sisteme kayıt oldu
5. findOrCreateForUser → "bu telefona ait müşteri kaydı var, linkliyeyim"
6. Yeni kişi eski müşterinin TÜM verilerine erişiyor → VERİ SIZMASI
```

Bu senaryo, **KVKK ihlali** ve potansiyel olarak **kişisel veri sızıntısı** anlamına gelir.

**Çözüm:** Telefon numarasını tek doğrulayıcı olarak kullanmak yerine **telefon + e-posta kombinasyonu** şart. Mevcut müşteri kaydı varsa linklemeden önce ek doğrulama adımı (örn. SMS OTP) gerektirilmeli.

---

### 26. 🗑️ Süresi Dolan Refresh Token'lar Hiç Temizlenmiyor

**Dosya:** `backend/src/auth/auth.service.ts`, `backend/prisma/schema.prisma` (RefreshToken tablosu)

Token rotation mekanizması var: Refresh token kullanıldığında eski silinir, yeni oluşturulur. **Ama:**

- Token `expiresAt` süresi dolmadan kullanıcı tarayıcıyı kapattıysa token hiç kullanılmaz → tabloda sonsuza kalır
- Birçok cihazdan giriş yapan kullanıcılar için çok sayıda zombie token birikmesi mümkün
- `RefreshToken` tablosu zamanla şişer → sorgu performansı düşer

```sql
-- Tabloda böyle kayıtlar birikir:
SELECT COUNT(*) FROM "RefreshToken" WHERE "expiresAt" < NOW();
-- Aylar sonra bu sayı on binleri bulabilir
```

**Çözüm:** Periyodik cron job ile süresi dolan token'ları temizle:

```typescript
// Örneğin her gece çalışacak cron:
@Cron('0 3 * * *') // Her gece 03:00'da
async cleanExpiredTokens() {
  const result = await this.prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  this.logger.log(`Cleaned ${result.count} expired refresh tokens`);
}
```

---

### 27. 🕵️ Swagger Dokümantasyonu Production'da Açık Kalabilir

**Dosya:** `backend/src/main.ts`

```typescript
// main.ts içinde Swagger kurulumu:
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('docs', app, document);
// ← NODE_ENV kontrolü var mı?
```

Eğer `NODE_ENV === 'production'` kontrolü yapılmıyorsa, production sunucusunda `https://api.nutopiano.com/docs` adresi herkese açık olur. Bu adres bir saldırgan için hazır bir rehberdir:
- Tüm endpoint'ler ve HTTP metodları
- Beklenen parametre tipleri ve validasyon kuralları
- Model yapıları ve alan isimleri
- Auth gerektiren vs. gerektirmeyen endpoint'ler

**Çözüm:**
```typescript
if (process.env.NODE_ENV !== 'production') {
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
}
```
Ya da production'da IP whitelist ile kısıtla.

---

### 28. 📅 Randevularda Çakışma (Double Booking) Kontrolü Belirsiz

**Dosya:** `backend/src/modules/appointments/` (muhtemelen yoktur)

`Appointment` modeli Prisma şemasında tanımlı (`SCHEDULED`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `NO_SHOW` statüleri var). Ancak:

- Aynı satıcı/personel için aynı gün ve saate birden fazla randevu alınabilir mi?
- Backend'de zaman çakışması kontrolü yapılıyor mu?
- Frontend'de müsait slot'lar gösteriliyor mu?

Eğer çakışma kontrolü yoksa:
```
Müşteri A: 14:00 - 15:00 randevu aldı
Müşteri B: aynı personel için 14:30 - 15:30 randevu aldı
→ Her ikisi de onay e-postası aldı
→ Personel only 14:00'da geldi → birine hizmet verilemedi → şikayet
```

**Çözüm:** Randevu oluştururken `[startTime, endTime)` aralığında çakışan aktif randevu var mı diye kontrol et. PostgreSQL'de bu sorgu `OVERLAPS` operatörü ile yazılabilir.

---

### 29. 💱 Para Birimi (Currency) Tanımlı Değil

**Dosya:** `backend/prisma/schema.prisma` (tüm finansal modeller)

`priceCents`, `totalAmountCents`, `amountCents`, `balance` — hepsi kuruş cinsinden saklanıyor. Bu akıllıca bir tasarım. Ama:

```prisma
model Product {
  priceCents Int  // ← Hangi para birimi? ₺? $? €?
  // currency alanı yok!
}

model Order {
  totalAmountCents Int  // ← Aynı soru
}
```

Sistem ileride farklı dövizle çalışan işletme eklenmek istendiğinde (multi-tenant mimarisi bu riski büyütüyor), tüm finansal modeller `currency` alanı için **tam schema migration** gerektirir. Bu noktada mevcut tüm verilerin para birimi geriye dönük olarak belirlenmesi gerekir ki bu çözülmesi zor bir veri sorunudur.

**Çözüm:** Şimdiden `currency String @default("TRY")` alanını finansal modellere ekle. Tek satırlık bir migration şimdi kolay, 2 yıl sonra çok zor.

---

### 30. 📁 Dosya Yükleme Güvenliği Belirsiz

**Dosya:** `backend/src/modules/uploads/`

`uploads/` modülü mevcut ve disk'e dosya kaydediliyor. Ancak şu soruların cevabı kodda açıkça tanımlanmış mı bilinmiyor:

| Kontrol | Risk |
|---------|------|
| Dosya tipi validation (`mimetype` kontrolü) | `.php`, `.svg`, `.html` yüklenirse XSS veya RCE riski |
| Boyut limiti | Büyük dosyalarla disk doldurulabilir (DoS) |
| Dosya adı sanitization | Path traversal (`../../etc/passwd`) riski |
| Public URL erişimi | Yüklenen her dosya herkese açık mı? |
| Antivirus tarama | Zararlı yazılım içeren dosya yüklenirse? |

Özellikle **SVG dosyaları** tehlikelidir çünkü SVG içinde `<script>` tag'i taşınabilir ve tarayıcı bunu çalıştırır.

**Çözüm kısa vade:** Multer'da `fileFilter` ile yalnızca `image/jpeg`, `image/png`, `image/webp` kabul et. `limits.fileSize` ile maksimum 5MB kısıtı koy.

---

### 31. 👁️ Gözlemlenebilirlik (Observability) Sıfır

**Kapsam:** Tüm production ortamı

Mevcut sistemde:
- ❌ Hata takip aracı yok (Sentry, Bugsnag)
- ❌ Structured logging yok (Winston, Pino — sadece `console.log`)
- ❌ Uygulama performans izleme (APM) yok (Datadog, New Relic)
- ❌ Uptime monitoring yok
- ❌ Anormal davranış alarmı yok

Production'da bir sorun oluştuğunda:
```
"Sipariş oluşturulamıyor" şikayeti geldi
→ Hangi sunucuda?
→ Hangi saatte başladı?
→ Kaç kullanıcı etkilendi?
→ Stack trace nerede?
→ Cevap: BİLİNMEZ
```

Özellikle kritik olaylar için kör nokta oluşturuyor:
- Transaction hataları (`$transaction` başarısız olduğunda ne oldu?)
- Stok anomalileri (stok neden negatife düştü?)
- Başarısız ödeme girişimleri (ne sıklıkla, hangi ürünlerde?)

**Çözüm (kısa vadeli, ücretsiz):** Sentry free tier eklemek 30 dakika alır. NestJS için `@sentry/node` paketi tüm hataları otomatik yakalar. Winston ile structured JSON logging eklenmesi birkaç saatlik iş.

---

---

# 🎯 ÖNCELİK SIRASI — Hemen Kapatılmesi Gereken 3 Sorun

Eğer tüm bu listeyle nereye başlayacağını bilemiyorsan, doğrudan kullanıcıya dokunan ve hukuki risk taşıyan üç soruna odaklan:

---

## 🥇 1. Sepet Fiyat Doğrulama (Sorun #23)

**Neden acil?** Kullanıcı şikayeti garantidir. "Bana gösterilen fiyattan farklı kesildi" mesajı ilk büyük kampanyadan sonra kesinlikle gelir. Hem UX hem güven sorunu.

**Yapılacak iş:**
- Checkout sayfası açılırken sepetteki her ürünün güncel fiyatını çek
- Fiyat değişmişse kullanıcıya uyarı göster ("X ürününün fiyatı güncellendi")
- Pasife alınmış ürünleri sepetten kaldır

---

## 🥈 2. Telefon Numarası Geri Dönüşümü (Sorun #25)

**Neden acil?** Veri sızıntısı riski. KVKK kapsamında kişisel veri ihlali. Başkasına ait sipariş geçmişine erişim sağlanması hem hukuki hem itibar sorunu.

**Yapılacak iş:**
- `findOrCreateForUser` içinde: Eşleşen müşteri kaydı varsa ama `userId` boşsa otomatik linklemeden önce e-posta veya SMS doğrulaması iste
- Uzun vadede: Kullanıcı kaydında hem telefon hem e-posta zorunlu, linkleme sadece ikisi eşleşirse yapılsın

---

## 🥉 3. Swagger Production Guard (Sorun #27)

**Neden acil?** Saldırı yüzeyi. 5 dakikalık düzeltme, büyük önlem. `main.ts`'e tek bir `if` bloğu eklemek yeterli.

**Yapılacak iş:**
```typescript
if (process.env.NODE_ENV !== 'production') {
  SwaggerModule.setup('docs', app, document);
}
```

---

---

# 🚨 EK KRİTİK VE ÖNEMLİ SORUNLAR

---

## 🔴 KRİTİK SEVİYE

---

### 32. 💾 OrderItem'da Fiyat Snapshot'ı Var mı?

**Dosya:** `backend/prisma/schema.prisma` (OrderItem modeli), `backend/src/modules/orders/orders.service.ts`

Sipariş oluştururken o anki `priceCents` değeri `OrderItem`'a kaydediliyor mu? Schema'ya bakıldığında `unitPriceCents` alanı mevcut — bu doğru bir tasarım. **Ancak** bu değerin gerçekten ürünün o anki fiyatından alınıp alınmadığı kritik:

```typescript
// orders.service.ts içinde (mevcut kod):
const unitPriceCents = product.priceCents;  // ← O anki fiyat
// Bu OrderItem'a yazılıyor mu?
itemData.push({ unitPriceCents, ... });     // ← Yazılıyor ✅
```

Kod incelendiğinde `unitPriceCents` doğru şekilde kaydediliyormuş gibi görünüyor. **Ama dikkat edilmesi gereken nokta:** Eğer fiyat verisi sadece `productId`'den türetilip canlı çekiliyorsa (örn. sipariş detayı gösterilirken join yapılıyorsa), ürün fiyatı değiştiğinde eski siparişlerin tutarları yanlış görünür.

**Kontrol edilmesi gereken:** Sipariş detayı endpoint'i OrderItem'ın kendi `unitPriceCents` değerini mi döndürüyor, yoksa `product.priceCents`'i mi join ediyor?

---

### 33. 🏢 Cross-Tenant Veri Sızıntısı — Merkezi Güvence Yok

**Kapsam:** Tüm `backend/src/modules/` servisleri

Multi-tenant mimaride her sorguda `businessId` filtresi şarttır. Şu anki yapıda her servis kendi `businessId` filtresini elle ekliyor:

```typescript
// Her serviste bunu el ile yazıyoruz:
const businessId = Number(currentUser.businessId);
await this.prisma.order.findMany({ where: { businessId, ... } });
```

**Risk:** Yeni bir endpoint yazılırken `where: { businessId }` unutulursa, başka işletmenin tüm verileri açığa çıkar. Bu hatayı engelleyen **merkezi bir mekanizma yok**. Her yeni endpoint potansiyel bir sızıntı noktası.

```
Senaryo:
Geliştirici yeni bir endpoint yazar
→ businessId filtresini unutur
→ Test ortamında tek işletme var, bug görünmez
→ Production'da farklı işletmeler var
→ A işletmesi B işletmesinin siparişlerini görür
```

**Çözüm:** Prisma middleware ile her query'e otomatik `businessId` filtresi enjekte et (Row Level Security benzeri). Ya da PostgreSQL RLS kullan.

---

### 34. 💸 Müşteri Bakiyesi Transaction Güvencesi Belirsiz

**Dosya:** `backend/src/modules/orders/orders.service.ts`, `backend/src/modules/customers/`

Bakiye (`Customer.balance`) düşürme ile sipariş oluşturma aynı `$transaction` içinde mi? İncelenen kod bu ikisini birleştirmiyor gibi görünüyor:

```typescript
// orders.service.ts içinde transaction:
const result = await this.prisma.$transaction(async (tx) => {
  // Stok düşür
  await tx.product.update({ data: { stock: { decrement } } });
  // Sipariş oluştur
  const order = await tx.order.create({ ... });
  // ← Bakiye düşürme BURADA YOK!
});
// Eğer bakiye düşürme transaction sonrasında ayrıca yapılıyorsa:
// → Sipariş oluştu ama bakiye düşmedi: müşteri bedava sipariş verdi
// → Bakiye düştü ama sipariş oluşmadı: müşteri para kaybetti
```

**Çözüm:** Bakiye kullanılıyorsa tüm finansal işlemleri tek `$transaction` içinde yap.

---

### 35. ⚡ `forgot-password` Rate Limit Kapsamı Belirsiz

**Dosya:** `backend/src/auth/auth.controller.ts`

```typescript
@Throttle(5, 900) // 15 dakikada 5 istek
@Post('login')
// ← login'e throttle var
```

`forgot-password` endpoint'i bu throttle kapsamına giriyor mu? Eğer girmiyorsa:

```
Saldırgan:
→ Döngüde binlerce POST /api/auth/forgot-password gönderir
→ Her biri için veritabanında token oluşturulur
→ Her biri için e-posta gönderme denemesi yapılır
→ E-posta servis kotası biter (Sendgrid, Nodemailer günlük limit)
→ Sistem artık hiç e-posta gönderemiyor
→ Gerçek kullanıcılar şifre sıfırlayamıyor
```

**Çözüm:** `forgot-password` endpoint'ine ayrı ve daha sıkı throttle: IP başına 10 dakikada 3 istek.

---

### 36. ⏱️ Şifre Sıfırlama Token Doğrulaması Timing-Safe mı?

**Dosya:** `backend/src/auth/auth.service.ts`

Dokümanda token'ın hash'i kaydediliyor denilmiş. Hash karşılaştırması nasıl yapılıyor?

```typescript
// Eğer şöyle yapılıyorsa — YANLIŞ:
if (storedHash === computedHash) { ... }  // timing attack riski!

// Olması gereken:
import crypto from 'crypto';
if (crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(computedHash))) { ... }
```

Normal string karşılaştırması (`===`) karakterleri sırayla karşılaştırır ve ilk uyuşmazlıkta durur. Bu, karşılaştırmanın ne kadar sürdüğünü ölçerek hash'i tahmin etmeye yarayan **timing attack**'e açıktır.

---

### 37. 🛡️ HTTP Güvenlik Header'ları Yok (Muhtemelen)

**Dosya:** `backend/src/main.ts`

`helmet.js` veya benzeri bir kullanım belirtilmemiş. Helmet, tek satırda aşağıdaki başlıkları ekler:

| Header | Koruduğu Saldırı |
|--------|-----------------|
| `X-Frame-Options: DENY` | Clickjacking |
| `Content-Security-Policy` | XSS, zararlı kaynak yükleme |
| `X-Content-Type-Options: nosniff` | MIME sniffing |
| `Strict-Transport-Security` | SSL stripping |
| `X-XSS-Protection` | Eski tarayıcılarda XSS |
| `Referrer-Policy` | Bilgi sızıntısı |

**Çözüm:** `npm install helmet` + `app.use(helmet())` — 2 satır, büyük güvenlik kazancı.

---

## 🟠 ÖNEMLİ SEVİYE

---

### 38. 🔙 Sipariş İptal Edilince Stok Geri Yüklenmiyor (Muhtemelen)

**Dosya:** `backend/src/modules/orders/orders.service.ts`

Sipariş oluştururken stok atomik olarak düşürülüyor. Peki sipariş iptal edildiğinde veya reddedildiğinde stok geri yükleniyor mu?

```typescript
// Sipariş durumu güncelleme:
async update(currentUser, id, payload) {
  // statusKey: 'CANCELLED' veya 'REJECTED' olduğunda
  // stok geri yüklemesi yapılıyor mu? → GÖRÜNMEMİYOR
}
```

Eğer stok iadesi yoksa:
- 100 ürün var → 10 sipariş geldi → 90 stok kaldı
- 10 siparişin 5'i iptal edildi → ama stok hâlâ 90
- Gerçekte 95 stok olması gerekirken sistem 90 gösteriyor
- Zamanla stok sıfırlanır, satış yapılamaz

**Çözüm:** `update()` içinde, durum `isFinal` ve iptal/red türündeyse stok artırımı yap.

---

### 39. 💰 İade (Refund) Mekanizması Tanımlı Değil

**Dosya:** `backend/prisma/schema.prisma` (Payment modeli)

`Payment` modeli var: `CASH`, `CARD`, `TRANSFER`, `OTHER` metodları tanımlı. Ama iade için:
- `refundAmount` alanı var mı?
- `refundedPaymentId` (hangi ödemeye karşılık) var mı?
- `RETURN_REQUESTED` durumu var ama bu duruma geçince ödeme iadesi otomatik mi?

E-ticarette iade kaçınılmazdır. Sonradan eklenirse mevcut `Payment` modeline büyük değişiklik gerekir ve eski ödeme kayıtlarıyla iade kayıtları arasında ilişki kurmak zorlaşır.

**Çözüm:** Şimdiden `refundedFrom Payment? @relation(...)` alanlarını ekle ve iade akışını tasarla.

---

### 40. 🗃️ Arşivlenen Ürün Aktif Siparişlerde Kaybolabilir

**Dosya:** `backend/src/modules/products/`, `backend/src/modules/orders/orders.service.ts`

Bir ürün `isActive = false` yapıldığında, o ürünü içeren eski siparişlerin detayı ne gösterir?

```typescript
// OrderItem join ile ürün bilgisi çekiliyorsa:
include: { product: true }
// → isActive = false ürün hâlâ join'de gelir ✅

// Fakat product silinmiş veya filtreleniyorsa:
where: { product: { isActive: true } }
// → Sipariş kalemi ürün bilgisi olmadan gelir ❌
```

`OrderItem`'da `unitPriceCents` snapshot'ı var ama ürün ismi (`name`), görseli (`imageUrl`) snapshot'ı var mı? Yoksa müşteri sipariş geçmişini açtığında hangi ürünü aldığını göremez.

**Çözüm:** `OrderItem`'a `productName` ve `productImageUrl` snapshot alanları ekle.

---

### 41. 📊 N+1 Sorgu Riski

**Dosya:** Backend modül servisleri

Sipariş listesi çekilirken her sipariş için ayrı ayrı müşteri, kalem veya ürün sorgusu atılıyorsa:

```typescript
// N+1 örneği:
const orders = await prisma.order.findMany({ where });
for (const order of orders) {
  const customer = await prisma.customer.findUnique({ where: { id: order.customerId } });
  // ← Her sipariş için ayrı sorgu!
}
// 100 sipariş = 101 sorgu
```

Prisma bunu `include` ile önleyebilir:
```typescript
const orders = await prisma.order.findMany({
  where,
  include: { customer: true, items: true }  // ← Tek sorgu
});
```

**Risk:** Şu an `select` kullanılarak bazı N+1'ler önlenmiş görünüyor ama tüm endpoint'lerde tutarlı mı bilinmiyor. Dashboard endpoint'leri özellikle risk altında.

---

### 42. 🗂️ Veritabanı Index Stratejisi Belirsiz

**Dosya:** `backend/prisma/schema.prisma`

Sık kullanılan sorgular için index var mı?

```prisma
// Şu an schema'da açıkça tanımlı index'ler:
@@unique([businessId, phone])  // Customer — var
// Ama:
Customer.phone    ← Her müşteri sorgusunda kullanılıyor, btree index var mı?
Order.createdAt   ← Sıralama için kullanılıyor, index var mı?
Order.statusId    ← Filtreleme için kullanılıyor, index var mı?
Product.isActive  ← Çok sık filtre, index var mı?
RefreshToken.token ← Her auth'da kullanılıyor, hash index şart
```

Index yoksa tablo büyüdükçe sorgular yavaşlar. 100.000 sipariş sonrası `ORDER BY createdAt DESC` sequential scan yapar.

**Çözüm:** `EXPLAIN ANALYZE` ile yavaş sorguları tespit et, kritik alanlara `@@index([createdAt])` ekle.

---

### 43. 💼 POS Modülü Muhasebe Akışları Belirsiz

**Dosya:** `frontend/src/app/pos/`, `backend/src/modules/orders/`

POS ve web/mobile siparişleri `source` alanıyla ayrışıyor (`POS`, `WEB`, `MOBILE`, `API`). Ancak gerçek bir POS sisteminde bulunması gereken:

- **Kasa kapanışı:** Günün sonunda nakit + kart toplamı
- **Gün sonu raporu:** X-raporu, Z-raporu
- **Nakit sayım:** Açılış kasası, kapanış kasası
- **Shift yönetimi:** Kim hangi vardiyada çalıştı

Bu akışların hiçbiri dokümanda görünmüyor. POS sadece sipariş oluşturmak için kullanılıyorsa muhasebe entegrasyonu ileride büyük efor gerektirir.

---

### 44. ↩️ Prisma Migration Rollback Yok

**Dosya:** `backend/prisma/` (migrations klasörü)

Prisma migration'ları tek yönlüdür. `prisma migrate deploy` komutu migration'ı uygular ama geri almak için bir yol sunmaz.

```bash
# Production'da hatalı migration:
prisma migrate deploy  # ← Uygulandı, tablo bozuldu
# Geri almak için:
# Elle SQL yaz, çalıştır, riski uzan → ÇOK RİSKLİ
```

**Çözüm:** Her migration için `down.sql` dosyası yaz ve saklı tut. Büyük schema değişikliklerinde önce staging'de test et.

---

### 45. ⚡ PM2 Single Instance — Event Loop Riski

**Dosya:** `ecosystem.config.cjs`

```javascript
{
  script: 'npm',
  args: 'run start:prod',
  // instances: 'max'  ← YOK
  // exec_mode: 'cluster'  ← YOK
}
```

Tek instance çalışıyor. Node.js single-threaded. Eğer:
- Büyük CSV export işlemi yapılıyorsa
- Ağır bir Prisma sorgusu çalışıyorsa
- Senkron bir hesaplama döngüsü varsa

...event loop bloke olur ve tüm API yanıt vermez hale gelir.

**Çözüm:**
```javascript
{ exec_mode: 'cluster', instances: 'max' }
```
Ya da ağır işlemleri BullMQ worker'larına taşı.

---

### 46. 🏥 Health Check Endpoint Yok

**Dosya:** `backend/src/app.controller.ts`

`/api/health` veya `/health` endpoint'i yok. Bu olmadan:
- Load balancer hangi instance'ın sağlıklı olduğunu bilemez
- PM2 process yaşıyor ama uygulama zombi modunda olabilir
- Kubernetes veya Docker health check yapılamaz
- Monitoring sistemi uptime ölçemez

```typescript
// Basit ama yeterli:
@Get('health')
health() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}
```

Daha gelişmişi: Prisma ve Redis bağlantısını da kontrol et.

---

## 🟡 ORTA VADELİ SORUNLAR

---

### 47. 🚀 Startup'ta Environment Variable Validation Yok

**Dosya:** `backend/src/main.ts`, `backend/src/common/config/`

```typescript
// Şu an:
const jwtSecret = this.config.get<string>('JWT_SECRET');
// Eğer undefined ise → runtime'da JWT işlemi çökecek, nereden geldiği belirsiz
```

`DATABASE_URL` veya `JWT_SECRET` eksik olduğunda uygulama başlarken değil, ilk kullanımda çöküyor. Hata mesajı genellikle kafa karıştırıcı.

**Çözüm:**
```typescript
// main.ts başında:
import Joi from 'joi';
const envSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  PORT: Joi.number().default(3001),
}).unknown();
const { error } = envSchema.validate(process.env);
if (error) throw new Error(`Config validation error: ${error.message}`);
```

---

### 48. 💧 React Hydration Mismatch Riski

**Dosya:** `frontend/src/app/providers.tsx`

```typescript
// providers.tsx içinde:
useEffect(() => {
  const savedCart = loadCartState();
  if (savedCart) dispatch(hydrateCart(savedCart));
}, []);
```

`hydrateCart`, `useEffect` içinde çağrılıyorsa (client-only), SSR sırasında sepet boş görünür, client mount sonrası dolar. Bu Next.js'in SSR/hydration süreciyle çelişebilir.

**Sorun:** "Server rendered HTML'de sepet yok, ama client render'da var" uyuşmazlığı. React bunu console'da uyarı olarak gösterir ama production'da sessizce kırılabilir.

**Çözüm:** `suppressHydrationWarning` veya localStorage erişimini `useIsomorphicLayoutEffect` ile koru.

---

### 49. 🚫 React Error Boundary Yok

**Dosya:** `frontend/src/app/error.tsx`

Next.js'in `error.tsx` dosyası route-level hataları yakalar. Ama component render sırasında oluşan hatalar için **React Error Boundary** bileşeni yok.

```
Senaryosu:
ProductCard bir ürünü render ederken hata fırlatır
→ Error Boundary olmadan tüm sayfa boş ekran olur
→ Kullanıcı gördüğü ekran: tamamen beyaz sayfa
→ Hata console'da görünür ama kullanıcı hiçbir şey görmez
```

**Çözüm:** `<ErrorBoundary>` wrapper component yaz ve kritik seksiyon'ları sar.

---

### 50. 🔄 React Query Cache Invalidation Stratejisi Belirsiz

**Dosya:** `frontend/src/app/` (sipariş, ürün sayfaları)

Sipariş oluşturulunca React Query cache'deki ürün stok bilgisi otomatik güncelleniyor mu?

```typescript
// Sipariş oluşturma başarılı olduktan sonra:
onSuccess: () => {
  queryClient.invalidateQueries(['products']); // ← Bu var mı?
  // Yoksa kullanıcı stoku güncellenmiş olmasına rağmen eski değeri görür
}
```

Özellikle çoklu sekme kullanan kullanıcılarda stale veri ciddi UX problemi yaratır.

---

### 51. 🖼️ Resim Optimizasyonu Yok

**Dosya:** `backend/src/modules/uploads/`, `frontend/` (Image kullanımı)

Yüklenen görseller olduğu gibi `uploads/` klasöründen serve ediliyor (muhtemelen). Optimize edilmemiş resimler:
- 5MB'lık JPEG → mobilde 10-15 saniye yükleme süresinin
- WebP dönüşümü yok → modern formattan yararlanılamıyor
- Responsive srcset yok → 4K görsel küçük ekranda da yükleniyor

**Çözüm kısa vade:** Yükleme sırasında `sharp` ile 1200px max genişlik ve %80 kaliteye sıkıştır, WebP oluştur.

---

### 52. 💱 API Rate Limit State'i In-Memory

**Dosya:** `backend/src/app.module.ts`

```typescript
ThrottlerModule.forRoot([
  { ttl: 60000, limit: 60 },
]),
```

`ThrottlerModule` varsayılan olarak in-memory storage kullanır. Birden fazla PM2 instance veya sunucu olduğunda her biri kendi sayacını tutar:

```
Saldırgan saniyede 50 istek gönderir:
  → Instance A: 25 istek gördü, limit yok
  → Instance B: 25 istek gördü, limit yok
  → Toplam: 50 istek geçti, hiçbiri throttle'lanmadı!
```

**Çözüm:** `@nestjs/throttler` + Redis store: `ThrottlerStorageRedisService`.

---

## 🔵 UZUN VADELİ / YAPISAL SORUNLAR

---

### 53. ⚖️ KVKK / GDPR Uyumu Yok

Müşteri "verilerimi silin" talebinde bulunursa:

```
Şu an:
Customer kaydını sil → Bağlı Orders'lar sahipsiz kalır
→ Sipariş kayıtlarında customerId = null veya FK hatası
→ Finansal kayıtlar (Payment, Commission) eksik kalır
→ KVKK'nın "veri minimizasyonu" kuralıyla çelişiyor
```

**Doğru yaklaşım — "Unut ama tut" stratejisi:**
- Kişisel veriler anonimleştirilir: `name = "Silinmiş Kullanıcı"`, `phone = null`, `email = null`
- Finansal kayıtlar korunur (vergi mevzuatı 10 yıl saklama zorunluluğu)
- `deletedAt` timestamp'i eklenir

---

### 54. 🧪 Test Coverage Sıfır

Projenin hiç birinde (backend/test/ klasöründe spec dosyaları var ama içi boş olabilir) kapsamlı test görünmüyor.

Kritik path'lerin test edilmemesi:

| Kritik Flow | Test Var mı? | Risk |
|-------------|-------------|------|
| Sipariş oluşturma + stok düşürme | ❓ | Yüksek |
| Ödeme işleme | ❓ | Yüksek |
| Auth token rotation | ❓ | Yüksek |
| Komisyon hesabı | ❓ | Orta |
| findOrCreateForUser | ❓ | Orta |

Her refactor bu flow'lardan birini kırabilir.

---

### 55. 🎭 Staging Ortamı Belirsiz

`ecosystem.config.cjs` sadece production ortamını tanımlıyor. Staging (test) ortamı için:
- Ayrı veritabanı var mı?
- Ayrı `.env.staging` var mı?
- CI/CD pipeline staging'e otomatik deploy ediyor mu?

Yoksa her deployment direkt production'a gidiyor ve hata riski çok yüksek.

---

### 56. 💾 Yedekleme Stratejisi Yok

PostgreSQL için otomatik backup mekanizması belirtilmemiş:
- **Günlük backup:** Tüm veritabanının snapshot'ı
- **WAL streaming:** Point-in-time recovery (PITR) için
- **Retention policy:** Kaç günlük backup saklanır?
- **Restore testi:** Backup'tan geri dönülebiliyor mu? Test edildi mi?

Disk arızasında veya hatalı migration'da veri kaybı tam anlamıyla mümkün.

---

### 57. 🎉 Kampanya / Kupon / İndirim Sistemi Yok

`OrderItem`, `Order`, `Product` modellerinde indirim için hiçbir alan yok:
- `discountCents` alanı yok
- `couponCode` nesnesi yok
- Kampanya tablosu yok

Sonradan eklenmesi tüm sipariş akışını etkiler: sipariş toplamı hesabı, komisyon oranları, muhasebe entegrasyonu, iade hesabı hepsi değişmek zorunda kalır.

**Çözüm:** Şimdiden `discountCents Int @default(0)` ve `couponId Int?` alanlarını ekle, mantığını sonra doldur.

---

---

# 🎯 KAPSAMLI ÖNCELİK TABLOSU — Tüm 57 Sorun

Aşağıdaki tablo tüm tespit edilen sorunları **aciliyet** ve **etki** derecesine göre sıralar.

---

## 🔴 HEMEN YAP — Bu Hafta (Güvenlik ve Veri Bütünlüğü)

| # | Sorun | Dosya | Çözüm Süresi |
|---|-------|-------|-------------|
| 27 | Swagger production'da açık | `main.ts` | 5 dk |
| 37 | Helmet.js yok | `main.ts` | 10 dk |
| 35 | forgot-password rate limit | `auth.controller.ts` | 30 dk |
| 24 | Eski şifre token'ları iptal edilmiyor | `auth.service.ts` | 1 saat |
| 36 | Token karşılaştırma timing-safe değil | `auth.service.ts` | 1 saat |
| 46 | Health check endpoint yok | `app.controller.ts` | 1 saat |
| 47 | Startup env validation yok | `main.ts` | 2 saat |
| 19 | Cookie SameSite/Secure tutarsızlığı | `auth.controller.ts` | 1 saat |

---

## 🟠 BU AY YAP — (Güvenilirlik ve Veri Güvenliği)

| # | Sorun | Dosya | Çözüm Süresi |
|---|-------|-------|-------------|
| 25 | Telefon carrier recycling (veri sızıntısı) | `customers.service.ts` | 1 gün |
| 23 | Stale cart fiyat doğrulama | `checkout/page.tsx` | 1 gün |
| 33 | Cross-tenant sızıntı riski | Tüm servisler | 3 gün |
| 34 | Bakiye transaction güvencesi | `orders.service.ts` | 1 gün |
| 13 | Sipariş idempotency yok | `orders.service.ts` | 2 gün |
| 14 | findOrCreateForUser race condition | `customers.service.ts` | 1 gün |
| 2 | Stok lock (SELECT FOR UPDATE) | `orders.service.ts` | 1 gün |
| 22 | Komisyon race condition | `orders.service.ts` | 1 gün |
| 38 | İptal edilince stok geri yüklenmiyor | `orders.service.ts` | 1 gün |
| 26 | Süresi dolan token'lar temizlenmiyor | `auth.service.ts` | 4 saat |
| 32 | OrderItem fiyat snapshot'ı | `schema.prisma` | 4 saat |
| 40 | Arşivlenen ürün sipariş snapshot'ı | `schema.prisma` | 4 saat |

---

## 🟡 3 AY İÇİNDE YAP — (Performans ve Operasyon)

| # | Sorun | Çözüm |
|---|-------|-------|
| 16 | Caching katmanı yok | Redis + CacheModule |
| 17 | Sipariş bildirimi yok | EmailService entegrasyonu |
| 20 | Audit log yok | Prisma middleware |
| 21 | Full-text search verimsiz | pg_trgm extension |
| 31 | Observability sıfır | Sentry + Winston |
| 41 | N+1 sorgu riski | Prisma include review |
| 42 | Index stratejisi belirsiz | Schema index'leri ekle |
| 44 | Migration rollback yok | down.sql dosyaları |
| 45 | PM2 single instance | cluster mode |
| 48 | React hydration mismatch | useEffect koru |
| 49 | Error Boundary yok | ErrorBoundary component |
| 50 | React Query cache invalidation | invalidateQueries ekle |
| 52 | Rate limit in-memory | Redis throttler |
| 3 | Siparişlerde userId yerine phone | orders.service.ts |
| 10 | Soft delete yok | deletedAt alanları |
| 6 | SMTP sessiz başarısız | Prod'da hata fırlat |

---

## 🔵 6 AY İÇİNDE YAP — (Mimari ve Ölçeklenebilirlik)

| # | Sorun | Çözüm |
|---|-------|-------|
| 15 | JWT key rotation yok | kid claim sistemi |
| 18 | API versiyonlama yok | `/api/v1/` prefix |
| 7 | Multi-tenant yarım | Interceptor ile inject |
| 12 | Disk tabanlı upload | S3/cloud storage |
| 29 | Currency alanı yok | schema migration |
| 39 | İade mekanizması yok | Refund modeli |
| 51 | Resim optimizasyonu | sharp + WebP |
| 53 | KVKK uyumu | Anonimleştirme stratejisi |
| 54 | Test coverage sıfır | Jest unit/integration |
| 55 | Staging ortamı yok | CI/CD pipeline |
| 56 | Yedekleme stratejisi yok | pg_dump + cron |
| 57 | Kupon/kampanya sistemi yok | discountCents alanı |
| 43 | POS muhasebe akışları | Kasa kapanışı modülü |
| 9 | Sayfalama çift sorgu | Optimizasyon |
| 28 | Randevu çakışma kontrolü | OVERLAPS sorgusu |

---

## 📊 Özet İstatistik

| Seviye | Adet | Toplam |
|--------|------|--------|
| 🔴 Hemen Yap (Bu Hafta) | 8 | — |
| 🟠 Bu Ay | 12 | — |
| 🟡 3 Ay İçinde | 16 | — |
| 🔵 6 Ay İçinde | 15 | — |
| **Toplam** | **57** | **sorun** |

---

---

# ⚡ YENI SORUN PAKETİ — 58'den 85'e

---

## 🔴 KRİTİK SEVİYE

---

### 58. ➖ `updateQuantity` Negatif Değer Kabul Edebilir

**Dosya:** `frontend/src/store/cartSlice.ts`

```typescript
updateQuantity(state, action: PayloadAction<{ lineId: string; quantity: number }>) {
  const item = state.items.find(i => i.lineId === action.payload.lineId);
  if (item) {
    item.quantity = action.payload.quantity;  // ← Negatif olabilir!
    // ...fiyat hesapla
  }
}
```

Eğer `quantity` için `> 0` kontrolü yoksa:
- Dispatcher `quantity: -5` gönderebilir
- `totalPrice` negatife düşer
- Kullanıcıya "toplam: -250₺" gösterilir

Backend fiyatı doğru hesapladığı için ücretlendirme doğru olur ama kullanıcıya gösterilen yanlış toplam güvensizlik yaratır. Ayrıca localStorage'a negatif değer kaydedilir.

**Çözüm:**
```typescript
item.quantity = Math.max(1, action.payload.quantity);
```

---

### 59. 🔄 CSRF Token Rotation Yok

**Dosya:** `backend/src/common/middleware/csrf.middleware.ts`

Şu an her oturumda tek bir `__csrf` cookie'si üretiliyor ve oturum boyunca sabit kalıyor. Token bir şekilde çalınırsa (network sniffing, XSS) oturum boyunca geçerliliğini korur.

**CSRF Token Rotation** — her başarılı POST/PUT/DELETE sonrası yeni token üret:

```
Şu an: Token = A (login'den logout'a kadar aynı)
Olması gereken:
  POST /api/orders → Token A kullanıldı → Backend B tokenı üret → Response header'a koy
  Sonraki istek: Token B kullanılmalı
```

Bu yaklaşım "Synchronizer Token Pattern"in en güvenli halidir.

---

### 60. 🔐 bcrypt Round Sayısı Bilinmiyor

**Dosya:** `backend/src/auth/auth.service.ts`

```typescript
const hash = await bcrypt.hash(password, saltRounds);
// saltRounds = ??? 
```

Eğer `saltRounds` düşükse (örn. 8 veya 10):

| saltRounds | Hash süresi | Güvenlik (2026) |
|-----------|------------|----------------|
| 8 | ~1ms | ❌ Çok zayıf |
| 10 | ~100ms | ⚠️ Kabul edilebilir minimum |
| 12 | ~250ms | ✅ Önerilen |
| 14 | ~1000ms | ✅ Güçlü |

Modern GPU'larla `rounds=8` saniyede milyonlarca deneme yapılabilir.

**Çözüm:** `saltRounds: 12` (minimum). Config olarak sakla, güncellenebilir olsun.

---

### 61. 🆔 Appointment Oluşturmada IDOR Riski

**Dosya:** `backend/src/modules/appointments/`

Randevu oluşturma endpoint'inde `customerId` client'tan mı geliyor?

```typescript
// Eğer böyleyse — TEHLİKELİ:
async createAppointment(currentUser: JwtPayload, payload: { customerId: number, ... }) {
  // customerId doğrulanmıyor mu?
  await this.prisma.appointment.create({ data: { customerId: payload.customerId } });
}
```

**IDOR (Insecure Direct Object Reference):** Müşteri A, `customerId: B_id` göndererek müşteri B için randevu oluşturabilir. Daha da kötüsü, B'nin randevusunu silmek veya güncellemek için aynı açık kullanılabilir.

**Çözüm:** `CUSTOMER` rolündeyse `customerId` her zaman `currentUser.customerId`'den alınmalı, payload'dan değil.

---

### 62. 🆔 Order Endpoint'inde IDOR Riski

**Dosya:** `backend/src/modules/orders/orders.service.ts`

```typescript
// findAccessibleOrder içindeki kontrol:
const order = await this.prisma.order.findFirst({
  where: { id, businessId },  // ← businessId var ✅
  include: { status: true },
});

// CUSTOMER için ek kontrol:
if (currentUser.role === 'CUSTOMER') {
  // Phone ile müşteri bul, sonra order.customerId ile karşılaştır ✅
}
```

Kod incelendiğinde `findAccessibleOrder` fonksiyonu `businessId` + rol bazlı erişim kontrolü yapıyor. **Ama:** `STAFF` rolündeki kullanıcı için yalnızca `createdByUserId` kontrolü var — `customerId` kontrolü yok. Bir staff kullanıcısı kendi oluşturmadığı siparişe `/api/orders/:id` ile erişebilir mi? Bu rol bazlı sızıntı.

---

## 🟠 ÖNEMLİ SEVİYE

---

### 63. ⏳ `prisma.$transaction` Timeout Ayarı Yok

**Dosya:** `backend/src/modules/orders/orders.service.ts`

```typescript
const result = await this.prisma.$transaction(async (tx) => {
  // Stok kontrolü, ürün kilitleme, sipariş oluşturma...
  // Timeout: varsayılan 5 saniye
});
```

Yüksek yük altında transaction uzarsa:
- Bağlantı 5 saniye bloke kalır
- Connection pool (varsayılan 10 bağlantı) dolar
- Yeni istekler `PrismaClientKnownRequestError: Can't reach database server` alır
- Zincirleme başarısızlık (cascade failure)

**Çözüm:**
```typescript
await this.prisma.$transaction(async (tx) => { ... }, {
  maxWait: 3000,   // Bağlantı bekleme süresi (ms)
  timeout: 8000,   // Transaction süresi (ms)
});
```

---

### 64. 🔗 Connection Pool Boyutu Ayarsız

**Dosya:** `backend/prisma/schema.prisma` veya `backend/src/database/prisma.service.ts`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // connection_limit belirtilmemiş
}
```

Varsayılan davranış: `connection_limit = 10` per process.

```
PM2 cluster: 4 instance × 10 connection = 40 Prisma bağlantısı
PostgreSQL varsayılan max_connections = 100
Başka servisler varsa: 40 + N bağlantı
→ Yük altında yeni bağlantılar reddedilir
```

**Çözüm:**
```
DATABASE_URL="postgresql://...?connection_limit=5&pool_timeout=10"
```
Toplam: 4 instance × 5 = 20 bağlantı. PgBouncer ile daha iyi yönetim.

---

### 65. 🔍 Seller Profil Endpoint'i Hassas Veri Sızıntısı

**Dosya:** `backend/src/modules/sellers/sellers.service.ts`

`findOnePublicBySlug` herkese açık. Döndürülen veri:

```typescript
select: {
  id: true,
  slug: true,
  displayName: true,
  description: true,
  logoUrl: true,
  userId: true,    // ← userId public'e açılıyor!
}
```

`userId` dışarıya çıkıyor. Bu değer başka endpoint'lere saldırı için kullanılabilir. `userId` hiçbir zaman public response'a girmemeli.

---

### 66. 📁 Dosya Yükleme Path Traversal Riski

**Dosya:** `backend/src/modules/uploads/`

Multer konfigürasyonunda dosya adı nasıl belirleniyor?

```typescript
// Tehlikeli:
filename: (req, file, cb) => {
  cb(null, file.originalname);  // ← "../../etc/passwd" olabilir!
}

// Güvenli:
filename: (req, file, cb) => {
  const uuid = crypto.randomUUID();
  const ext = path.extname(file.originalname);
  cb(null, `${uuid}${ext}`);  // ← Güvenli
}
```

Sanitize edilmemiş dosya adı ile sunucu dosya sistemine erişim sağlanabilir.

---

### 67. 🔄 Frontend'de Token Yenileme (Refresh) Mekanizması Yok

**Dosya:** `frontend/src/services/api.ts`

Access token 15 dakikada bir sona erer. Kullanıcı şu an neler yaşıyor?

```
Senaryo:
→ Kullanıcı uzun bir sipariş formu dolduruyor (15 dk)
→ Access token sona erdi
→ "Sipariş oluştur" butonuna bastı → 401 Unauthorized
→ Login sayfasına yönlendirildi
→ Formdaki tüm veri kayboldu
```

```typescript
// api.ts'de response interceptor olmalı:
axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      await axios.post('/api/auth/refresh');  // Sessizce refresh
      return axiosInstance(error.config);     // İsteği tekrar gönder
    }
    return Promise.reject(error);
  }
);
```

---

### 68. 🗂️ Kategori Silinince Cascade Davranışı Belirsiz

**Dosya:** `backend/prisma/schema.prisma`

```prisma
model Category {
  id       Int        @id
  parentId Int?
  parent   Category?  @relation("SubCategories", fields: [parentId], references: [id])
  children Category[] @relation("SubCategories")
  products Product[]
}
```

Üst kategori silinirse:
- Alt kategorilerin `parentId` → `null` mı olur? Cascade delete mi? Hata mı verir?
- O kategorideki ürünlerin `categoryId` → `null` mı olur?

Schema'da `onDelete` davranışı açıkça tanımlanmamışsa PostgreSQL FK constraint hatası verir — ve bu hata production'da elle müdahale gerektiren kilitlenmeye yol açabilir.

**Çözüm:**
```prisma
parent Category? @relation("SubCategories", ..., onDelete: SetNull)
products Product[] // Product.categoryId → onDelete: SetNull
```

---

### 69. 📱 Aynı Telefona Birden Fazla `User` Açılabilir mi?

**Dosya:** `backend/prisma/schema.prisma` (User modeli)

```prisma
model User {
  phone String?
  // @@unique([phone]) ← VAR MI?
}
```

Eğer `phone` alanında unique constraint yoksa:
- İki kişi aynı telefon ile kayıt olabilir
- `findOrCreateForUser` hangi kullanıcıya hangi müşteriyi bağlayacağını bilemez
- Birden fazla `findFirst` sonucu döner, sistem tutarsız hale gelir

---

### 70. 🚦 Sipariş Durumu Geçişleri State Machine Olmadan Serbest

**Dosya:** `backend/src/modules/orders/orders.service.ts`

```typescript
async update(currentUser, id, payload) {
  if (payload.statusKey) {
    const status = await prisma.orderStatus.findFirst({ where: { key: payload.statusKey } });
    data.statusId = status.id;
    // ← Herhangi bir durumdan herhangi bir duruma geçiş serbest!
  }
}
```

Geçersiz geçişler mümkün:
- `DELIVERED → PENDING` (teslim edilen sipariş beklemede olamaz)
- `CANCELLED → CONFIRMED` (iptal edilen onaylanamaz)
- `PAYMENT_FAILED → COMPLETED` (ödeme başarısız ama tamamlandı?)

**Çözüm:** State machine tanımla:
```typescript
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'CREATED': ['CONFIRMED', 'CANCELLED'],
  'CONFIRMED': ['SHIPPED', 'CANCELLED'],
  'SHIPPED': ['DELIVERED', 'RETURN_REQUESTED'],
  'DELIVERED': ['RETURN_REQUESTED'],
};
```

---

### 71. 💰 Komisyon Hesabı Floating Point Risk

**Dosya:** `backend/src/modules/finance/finance.service.ts`

```typescript
// Eğer böyle hesaplanıyorsa — TEHLİKELİ:
const commission = order.totalAmountCents * commissionRate;  // Float!
// 1000 * 0.15 = 150.00000000000003  ← Kayan nokta hatası!

// Doğrusu:
const commission = Math.round(order.totalAmountCents * commissionRate);
// Ya da BigInt kullan
```

Finansal sistemlerde kayan nokta (float) ASLA kullanılmamalıdır. Kuruş birikimleri zamanla muhasebe dengesizliklerine yol açar.

---

## 🟡 ORTA VADELİ SORUNLAR

---

### 72. 📋 `console.log` Production'da Kalmış Olabilir

**Dosya:** Tüm backend servisleri

```typescript
// email.service.ts'de:
console.log('Password reset email queued:', { to, resetUrl, messageId });
// ← resetUrl production log'larına düşüyor!
```

`resetUrl` içinde şifre sıfırlama token'ı var. Bu log'a düşen token:
- Log aggregation sisteminde görünür
- Ekran görüntüsüyle paylaşılabilir
- Log dosyasına erişimi olan herkes kullanabilir

**Çözüm:** NestJS `Logger` servisi kullan, production'da `debug` level'ını kapat. Hassas veriyi loglamadan önce maskele.

---

### 73. 📅 Appointment Reminder (Hatırlatma) Sistemi Yok

**Dosya:** `backend/src/modules/appointments/`

Randevu sistemi var ama:
- Randevudan 24 saat önce SMS/e-posta hatırlatma yok
- Randevudan 1 saat önce push notification yok
- `NO_SHOW` durumu var — ama no-show oranını düşürmek için önleyici bir adım yok

Randevu hatırlatmaları olmadan no-show oranı genellikle %30-40'a çıkar. Bu hem satıcı hem müşteri için kayıp.

---

### 74. 🎯 `isActive` Filtresi Tutarsız Uygulanıyor Olabilir

**Dosya:** Ürün sorgulayan tüm servisler

```typescript
// Marketplace: isActive filtresi var ✅
where: { businessId, isActive: true }

// POS modülü: isActive filtresi var mı? ❓
// Admin panel: Pasif ürünler listelenebilmeli ✅ (doğru)
// Customer portal: isActive filtresi var mı? ❓
```

Eğer POS modülü `isActive` filtresiz çalışıyorsa satış dışı bir ürün kasadan satılabilir.

---

### 75. 🌍 `PUBLIC_BUSINESS_ID` Client Bundle'ına Gömülme Riski

**Dosya:** `frontend/.env.local`

```
NEXT_PUBLIC_BUSINESS_ID=1
```

`NEXT_PUBLIC_` prefix'li değişkenler Next.js tarafından JavaScript bundle'ına gömülür — herkes browser DevTools ile görebilir. `businessId` tek başına kritik değil, ama multi-tenant geçişte tüm mimari client'a sızdırılmış olur.

---

### 76. 💳 Split Payment (Karma Ödeme) Desteği Belirsiz

**Dosya:** `backend/src/modules/orders/orders.service.ts`, frontend checkout

`Payment` modeli birden fazla ödeme kaydına izin veriyor (sipariş başına N ödeme). Ama:
- "500₺'nin 300₺'sini nakit, 200₺'sini kartla" akışı destekleniyor mu?
- Frontend checkout stepper bunu gösteriyor mu?
- Toplam ödenmiş tutar siparişin tutarıyla eşleşiyor mu diye kontrol var mı?

---

### 77. 🔍 Sayfa Başlıkları ve SEO Stratejisi Yok

**Dosya:** `frontend/src/app/` (tüm sayfalar)

```typescript
// Eğer metadata export edilmemişse:
// layout.tsx'deki tek başlık tüm sayfalara uygulanır
export const metadata = { title: 'Nutopiano' };
// → Google'da tüm ürün sayfaları "Nutopiano" başlığıyla görünür
```

E-ticaret için SEO kritiktir. Her ürün sayfasının:
- Benzersiz `title` ve `description`'ı olmalı
- `og:image` ve `og:description` olmalı
- Yapısal veri (JSON-LD schema.org Product) olmalı

---

### 78. 📦 Webhook Sistemi Yok

**Dosya:** Backend (hiçbir yerde yok)

Sipariş durumu değişince dış sistemleri bilgilendirmek için webhook altyapısı yok. Gelecekte:
- Muhasebe yazılımı entegrasyonu (Logo, Mikro, Netsis)
- Kargo firması API entegrasyonu (Aras, Yurtiçi)
- SMS servisi entegrasyonu

Her biri için kod yazılması gerekecek. Webhook sistemi olsa tek bir event ile hepsi tetiklenebilir.

---

### 79. 🚚 Kargo Entegrasyonu ve Teslimat Adresi Modeli Eksik

**Dosya:** `backend/prisma/schema.prisma` (Order modeli)

`Product.type = PHYSICAL` var — fiziksel ürünler var demek. Ama `Order` modelinde:
- `shippingAddressId Int?` → var mı?
- `trackingNumber String?` → var mı?
- `carrierId Int?` (kargo firması) → var mı?

Bunlar yoksa:
- Kargo etiketi oluşturulamaz
- Sipariş takibi yapılamaz
- Teslimat adresi siparişe bağlı değil (müşteri adresi sonradan değiştirirse eski sipariş de etkilenir)

---

## 🔵 YAPISAL / UZUN VADELİ

---

### 80. 📄 OpenAPI Spec Versiyon Kontrolünde Değil

**Dosya:** Backend (Swagger otomatik üretim)

Swagger her build'de otomatik üretiliyor ama bu spec'in snapshot'ı alınıp git'e commit edilmiyor. Sonuç:
- API'ya breaking change eklendiğinde otomatik fark edilmiyor
- Frontend/mobil takım hangi endpoint'in değiştiğini manuel takip etmek zorunda
- CI'da `openapi-diff` ile kırılmış sözleşme tespiti yapılamıyor

---

### 81. 📦 Frontend Bundle Analizi Yok

**Dosya:** `frontend/next.config.ts`

```typescript
// next.config.ts'de bundle-analyzer yok
```

Redux + React Query + Axios + Lucide Icons birlikte kullanılıyor. Bu kütüphaneler tree-shaking yapılmadığında büyük bundle oluşturabilir. Next.js `@next/bundle-analyzer` ile hangi modülün ne kadar yer kapladığı görülebilir.

---

### 82. ♿ Accessibility (a11y) Sıfır

**Dosya:** `frontend/src/components/` (tüm bileşenler)

- `Header.tsx`: Hamburger menü butonu `aria-label` var mı?
- `ProductCard.tsx`: Resim `alt` attribute doğru kullanılıyor mu?
- Form elemanları `label` ile eşleşiyor mu?
- Klavye navigasyonu (Tab, Enter, Esc) çalışıyor mu?
- Renk kontrastı WCAG AA standardını karşılıyor mu?

Türkiye'de engelli hakları mevzuatı kapsamında dijital erişilebilirlik yasal yükümlülük haline geliyor.

---

### 83. 📢 Hata Mesajı Standardizasyonu Yok

**Dosya:** Backend (tüm controller ve servisler)

```typescript
// Farklı formatlarda hata döndürülüyor olabilir:
throw new NotFoundException('Customer not found');         // format A
throw new BadRequestException({ message: 'Invalid' });     // format B
return { success: false, error: 'Something went wrong' };  // format C
```

Frontend her yerde farklı error handling yapmak zorunda kalıyor. Tutarsız hata formatları lokalizasyon ve kullanıcı deneyimini olumsuz etkiler.

**Çözüm:** `HttpExceptionFilter` ile tüm hataları tek formata dönüştür:
```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "..." } }
```

---

### 84. 📡 Logging Stratejisi Tutarsız

**Dosya:** Tüm backend

NestJS `Logger` sınıfı var ama:
- Her modül Logger kullanıyor mu yoksa `console.log` mu? Tutarsız
- JSON format (structured logging) var mı?
- Log level (DEBUG, INFO, WARN, ERROR) production'da doğru ayarlı mı?

```typescript
// Bu format log aggregation için işe yaramaz:
[Nest] 12345 - 21/02/2026 Order created successfully
// Bu format Elastic/Loki için mükemmel:
{"timestamp":"2026-02-21","level":"info","context":"OrdersService","message":"Order created","orderId":42,"businessId":1}
```

---

### 85. 🛡️ Dependency Güvenlik Taraması Yok

**Dosya:** `package.json` (backend + frontend)

`npm audit` veya `snyk` CI pipeline'ına entegre değilse:
- Bilinen güvenlik açıklı paket aylar sonra fark edilir
- `bcryptjs`, `jsonwebtoken`, `multer` gibi kritik güvenlik paketlerinin versiyonları takip edilmiyor
- Dependabot veya Renovate ayarlanmamışsa otomatik güncelleme yok

---

---

# 🎯 KAPSAMLI ÖNCELİK TABLOSU — Tüm 85 Sorun

---

## 🔴 HEMEN YAP — Bu Hafta (Güvenlik, Acil Düzeltmeler)

| # | Sorun | Dosya | Süre |
|---|-------|-------|------|
| 27 | Swagger production guard | `main.ts` | 5 dk |
| 37 | Helmet.js yok | `main.ts` | 10 dk |
| 58 | cartSlice negatif quantity | `cartSlice.ts` | 15 dk |
| 85 | npm audit / dependency tarama | `package.json` | 30 dk |
| 35 | forgot-password rate limit | `auth.controller.ts` | 30 dk |
| 60 | bcrypt saltRounds belirsiz | `auth.service.ts` | 30 dk |
| 47 | Startup env validation | `main.ts` | 2 saat |
| 66 | Dosya path traversal | `uploads/` | 1 saat |
| 24 | Eski şifre tokenları iptal edilmiyor | `auth.service.ts` | 1 saat |
| 36 | Timing-safe karşılaştırma | `auth.service.ts` | 1 saat |
| 46 | Health check endpoint | `app.controller.ts` | 1 saat |
| 19 | Cookie flag tutarsızlığı | `auth.controller.ts` | 1 saat |

---

## 🟠 BU AY — (Veri Güvenliği ve Güvenilirlik)

| # | Sorun | Dosya | Süre |
|---|-------|-------|------|
| 62 | Order endpoint IDOR | `orders.service.ts` | 4 saat |
| 61 | Appointment IDOR | `appointments/` | 4 saat |
| 65 | Seller public endpoint veri sızıntısı | `sellers.service.ts` | 2 saat |
| 69 | Telefon unique constraint yok | `schema.prisma` | 2 saat |
| 68 | Kategori silme cascade | `schema.prisma` | 4 saat |
| 25 | Telefon carrier recycling | `customers.service.ts` | 1 gün |
| 23 | Stale cart fiyat doğrulama | `checkout/page.tsx` | 1 gün |
| 33 | Cross-tenant sızıntı | Tüm servisler | 3 gün |
| 34 | Bakiye transaction güvencesi | `orders.service.ts` | 1 gün |
| 13 | Sipariş idempotency | `orders.service.ts` | 2 gün |
| 14 | findOrCreateForUser race condition | `customers.service.ts` | 1 gün |
| 2 | Stok lock (SELECT FOR UPDATE) | `orders.service.ts` | 1 gün |
| 38 | İptal → stok geri yükleme | `orders.service.ts` | 1 gün |
| 70 | State machine yok | `orders.service.ts` | 2 gün |
| 26 | Süresi dolan tokenlar temizlenmiyor | `auth.service.ts` | 4 saat |
| 63 | Transaction timeout ayarsız | `orders.service.ts` | 2 saat |
| 64 | Connection pool boyutu | `prisma.service.ts` | 2 saat |
| 67 | Frontend token refresh yok | `api.ts` | 1 gün |
| 71 | Komisyon floating point | `finance.service.ts` | 4 saat |
| 22 | Komisyon race condition | `orders.service.ts` | 1 gün |

---

## 🟡 3 AY İÇİNDE — (Performans, Operasyon, UX)

| # | Sorun | Çözüm |
|---|-------|-------|
| 16 | Caching yok | Redis + CacheModule |
| 17 | Sipariş bildirimi yok | EmailService entegrasyonu |
| 20 | Audit log yok | Prisma middleware |
| 21 | Full-text search | pg_trgm / tsvector |
| 31 | Observability sıfır | Sentry + Winston |
| 41 | N+1 sorgu riski | Prisma include review |
| 42 | Index stratejisi | @@index ekle |
| 44 | Migration rollback | down.sql dosyaları |
| 45 | PM2 single instance | cluster mode |
| 48 | React hydration mismatch | useIsomorphicLayoutEffect |
| 49 | Error Boundary yok | ErrorBoundary component |
| 50 | React Query cache | invalidateQueries |
| 52 | Rate limit in-memory | Redis throttler |
| 72 | console.log → Logger | NestJS Logger |
| 73 | Appointment reminder | Cron job + EmailService |
| 74 | isActive tutarsız filtre | Tüm servisler review |
| 77 | SEO / meta yok | Next.js metadata API |
| 79 | Kargo + adres modeli | schema.prisma güncelle |
| 83 | Hata mesajı standart yok | HttpExceptionFilter |
| 59 | CSRF token rotation | CSRF middleware güncelle |
| 10 | Soft delete yok | deletedAt alanları |
| 3 | userId yerine phone | orders.service.ts |
| 6 | SMTP sessiz başarısız | prod'da hata fırlat |

---

## 🔵 6 AY İÇİNDE — (Mimari, Ölçeklenebilirlik, Uzun Vade)

| # | Sorun | Çözüm |
|---|-------|-------|
| 15 | JWT key rotation | kid claim sistemi |
| 18 | API versiyonlama | /api/v1/ prefix |
| 7 | Multi-tenant yarım | Interceptor inject |
| 12 | Disk upload | S3 / cloud storage |
| 29 | Currency alanı yok | schema migration |
| 39 | İade modeli yok | Refund akışı |
| 51 | Görsel optimizasyon | sharp + WebP |
| 53 | KVKK uyumu | Anonimleştirme |
| 54 | Test coverage | Jest unit/integration |
| 55 | Staging ortamı | CI/CD pipeline |
| 56 | Yedekleme stratejisi | pg_dump + WAL |
| 57 | Kupon/kampanya | discountCents alanı |
| 43 | POS muhasebe | Kasa kapanışı modülü |
| 28 | Randevu çakışma | OVERLAPS sorgusu |
| 75 | PUBLIC_BUSINESS_ID | Server-side geçir |
| 76 | Split payment | Checkout güncelle |
| 78 | Webhook sistemi | Event bus + webhooks |
| 80 | OpenAPI versiyonlama | openapi-diff CI |
| 81 | Bundle analizi | @next/bundle-analyzer |
| 82 | Accessibility | ARIA + a11y audit |
| 84 | Structured logging | Winston JSON format |
| 9 | Sayfalama çift sorgu | Optimizasyon |

---

## 📊 Güncel Özet İstatistik

| Seviye | Adet |
|--------|------|
| 🔴 Bu Hafta (Kritik Güvenlik) | 12 |
| 🟠 Bu Ay (Güvenilirlik) | 20 |
| 🟡 3 Ay İçinde (Performans/UX) | 23 |
| 🔵 6 Ay İçinde (Mimari) | 22 |
| **Toplam** | **85 sorun** |

---

---

# 🗺️ NUTOPIANO — DETAYLI YOL HARİTASI

> Bu bölüm, tüm sorun ve eksiklikleri çözülmüş görevler olarak yapılandırır.  
> Tamamlanan her görev `[x]` işaretlenmeli, yeni tespitler eklenmelidir.

---

## 📊 ÖZET

| Faz | Kapsam | Süre | Görev |
|-----|--------|------|-------|
| **Faz 0** | Güvenlik ve Sağlamlaştırma | 3-4 hafta | 22 |
| **Faz 1** | Shopify (E-Ticaret) | 6-8 hafta | 35 |
| **Faz 1** | POS (Kasa) | 3-4 hafta | 12 |
| **DevOps** | Altyapı ve Deployment | Paralel | 7 |
| **Faz 2** | Booking (Randevu) | 6-8 hafta | 14 |
| **Faz 3** | Uber (Teslimat) | 10-14 hafta | 10 |
| **Toplam** | — | ~12–18 ay | **100** |

---

---

## 🛡️ FAZ 0 — GÜVENLİK VE TEMEL SAĞLAMLAŞTIRMA

> Canlıya çıkmadan önce mutlaka tamamlanmalı.

---

### 🔒 Güvenlik Kapamaları

- [ ] **S-01** `KRİTİK` **IDOR Kontrolü** *(4 saat)*  
  Sipariş, müşteri, randevu endpoint'lerinde `businessId + userId` çift kontrolü yap.  
  Her `GET/PATCH/DELETE` isteğinde kullanıcının o kaynağa erişim hakkı olduğunu doğrula.

- [ ] **S-02** `KRİTİK` **SELECT FOR UPDATE Ekle** *(3 saat)*  
  Stok düşürme transaction'ına PostgreSQL satır kilidi ekle.  
  Prisma `$queryRaw` ile `SELECT * FROM Product WHERE id=$1 FOR UPDATE NOWAIT` kullan.

- [ ] **S-03** `KRİTİK` **OrderItem Fiyat Snapshot** *(2 saat)*  
  `OrderItem` oluşturulurken o anki `priceCents` ve ürün adını kaydet.  
  Ürün fiyatı sonradan değişirse eski siparişler etkilenmesin.

- [ ] **S-04** `KRİTİK` **Telefon Unique Constraint** *(1 saat)*  
  `User` tablosunda `phone` alanına unique index ekle.  
  Prisma şemasında `@unique` ekle, migration çalıştır.

- [ ] **S-05** `KRİTİK` **Reset Token Invalidation** *(2 saat)*  
  `forgot-password` endpoint'i yeni token üretirken kullanıcıya ait eski tüm  
  reset token'larını sil veya geçersiz işaretle.

- [x] **S-06** `KRİTİK` **Swagger Production Kapatma** *(30 dk)*  
  `main.ts`'de `SwaggerModule` setup'ını `NODE_ENV !== 'production'` koşuluna bağla.

- [x] **S-07** `KRİTİK` **Helmet.js Ekle** *(1 saat)*  
  NestJS app'e `helmet()` middleware ekle.  
  `X-Frame-Options`, `CSP`, `HSTS` otomatik gelir.

- [ ] **S-08** `KRİTİK` **forgot-password Rate Limit** *(1 saat)*  
  Auth throttler kapsamına `forgot-password` endpoint'ini dahil et.  
  15 dakikada 3 istek yeterli.

- [ ] **S-09** `KRİTİK` **bcrypt Round Kontrolü** *(30 dk)*  
  `saltRounds` değerini kontrol et, minimum 12 olmalı. Düşükse güncelle.

- [ ] **S-10** `KRİTİK` **Cookie Güvenlik Flag'leri** *(1 saat)*  
  Access ve refresh token cookie'lerine `Secure: true`, `SameSite: Strict` ekle.  
  Production'da `httpOnly` zaten var, diğerleri eksik.

- [ ] **S-11** `KRİTİK` **Aynı Telefona Çift User Kaydı** *(1 saat)*  
  Register endpoint'inde telefon zaten kayıtlıysa açık hata döndür.  
  Unique constraint sonrası DB hatası yerine anlamlı mesaj ver.

- [ ] **S-12** `KRİTİK` **Cross-tenant Varlık Kontrolü** *(4 saat)*  
  Tüm module servislerinde `businessId` filtresinin tutarlı uygulandığını kontrol et.  
  Eksik olan endpoint'leri tespit et ve düzelt.

---

### 🏗️ Altyapı Kurulumu

- [ ] **I-01** `ÖNEMLİ` **Redis Kurulumu** *(3 saat)*  
  Redis'i bağımlılık olarak ekle. Başlangıçta sadece `ThrottlerModule` için  
  Redis store kullan. İleride cache ve queue için temel hazır olsun.

- [ ] **I-02** `ÖNEMLİ` **Sentry Entegrasyonu** *(2 saat)*  
  `@sentry/nestjs` ve `@sentry/nextjs` paketlerini ekle. DSN'i env'den oku.  
  Her production hatası otomatik raporlansın.

- [ ] **I-03** `ÖNEMLİ` **Env Variable Validation** *(2 saat)*  
  NestJS bootstrap'ta Joi veya zod ile tüm kritik env değişkenlerini validate et.  
  `DATABASE_URL`, `JWT_SECRET` vb. eksikse uygulama başlamasın.

- [ ] **I-04** `ÖNEMLİ` **Health Check Endpoint** *(2 saat)*  
  `@nestjs/terminus` ekle. `/api/health` endpoint'i DB bağlantısı ve Redis'i kontrol etsin.

- [ ] **I-05** `ÖNEMLİ` **.env.example Dosyası** *(1 saat)*  
  Tüm gerekli env değişkenlerini açıklamalı şekilde listele.  
  Değerleri boş bırak, hangi formatta olduğunu yorum olarak ekle.

- [ ] **I-06** `ÖNEMLİ` **Staging Ortamı** *(4 saat)*  
  Ayrı bir sunucu veya branch ile staging kur.  
  Production'a geçmeden önce her değişiklik buradan geçmeli.

- [ ] **I-07** `ÖNEMLİ` **PostgreSQL Backup** *(3 saat)*  
  Otomatik günlük backup planla.  
  `pg_dump` + cron veya yönetilen servis (Railway, Supabase) kullan.

- [ ] **I-08** `ÖNEMLİ` **PM2 Cluster Mode** *(30 dk)*  
  `ecosystem.config.cjs`'e `instances: "max"` ve `exec_mode: "cluster"` ekle.  
  Tüm CPU core'ları kullanılsın.

- [ ] **I-09** `ÖNEMLİ` **Structured Logging** *(3 saat)*  
  NestJS Logger yerine Winston veya Pino ekle. JSON format'ta log yaz.  
  `level`, `timestamp`, `requestId` alanları olsun.

- [ ] **I-10** `ÖNEMLİ` **API Versiyonlama** *(4 saat)*  
  Tüm endpoint'leri `/api/v1/` prefix'ine taşı. NestJS versioning modülü kullan.  
  Mevcut `/api/` route'larını deprecated tut.

---

---

## 🛒 FAZ 1 — SHOPİFY (E-TİCARET) MODÜLÜ

> Faz 0 tamamlandıktan sonra başla.

---

### 🔴 Kritik Görevler

- [x] **SH-01** `KRİTİK` **Sipariş İdempotency Key** *(4 saat)*  
  `POST /api/orders` isteğine `Idempotency-Key` header desteği ekle.  
  Aynı key ile gelen ikinci istek yeni sipariş oluşturmasın, ilkini döndürsün.  
  Redis'te key sakla, 24 saat TTL.

- [x] **SH-02** `KRİTİK` **Sipariş State Machine** *(4 saat)*  
  `OrderStatus` geçişlerini kısıtla. `DELIVERED → PENDING`'e gidilemez.  
  Her geçiş için izin verilen önceki state'leri tanımla.  
  Hatalı geçişte 400 hata döndür.

- [x] **SH-03** `KRİTİK` **Sipariş İptalinde Stok İadesi** *(3 saat)*  
  Sipariş iptal edildiğinde veya reddedildiğinde stok otomatik geri yüklensin.  
  `OrderStatus` değişikliğini dinleyen bir event veya hook ekle.

- [x] **SH-04** `KRİTİK` **Soft Delete Uygulaması** *(6 saat)*  
  `Customer` ve `Order` modeline `deletedAt` alanı ekle.  
  Tüm sorgulara `where: { deletedAt: null }` filtresi ekle.  
  Gerçek silme yerine bu alanı doldur.

- [x] **SH-05** `KRİTİK` **Stale Cart Fiyat Kontrolü** *(4 saat)*  
  Checkout sayfası yüklenirken sepetteki her ürünün güncel fiyatını backend'den çek.  
  Fiyat değişmişse kullanıcıyı uyar ve güncelle.

- [x] **SH-06** `KRİTİK` **Teslimat Adresi Modeli** *(3 saat)*  
  `Order` modeline teslimat adresi alanları ekle: adres satırı, ilçe, şehir, posta kodu.  
  Fiziksel ürün siparişlerinde zorunlu olsun.

- [x] **SH-07** `KRİTİK` **CUSTOMER Sipariş Erişimi** *(2 saat)*  
  `orders.service.ts`'de müşteri siparişlerini `phone` yerine önce `userId` ile ara.  
  Bulamazsan `phone` ile yedek ara. Telefon değişince erişim kesilmemeli.

- [x] **SH-08** `KRİTİK` **findOrCreateForUser Race Condition** *(3 saat)*  
  Aynı anda iki istek gelince iki müşteri kaydı oluşmasını engelle.  
  PostgreSQL `ON CONFLICT DO NOTHING` veya `unique constraint + upsert` kullan.

---

### 🟠 Önemli Görevler

- [x] **SH-09** `ÖNEMLİ` **Sipariş E-posta Bildirimi** *(6 saat)*  
  `EmailService` zaten var. Sipariş oluşturulunca, durumu değişince müşteriye e-posta gönder.  
  BullMQ job olarak yap, HTTP döngüsünü bloklama.

- [x] **SH-10** `ÖNEMLİ` **BullMQ + Redis Queue Kurulumu** *(6 saat)*  
  `@nestjs/bull` veya `bullmq` paketini ekle.  
  E-posta, bildirim, rapor işlerini queue'ya taşı.  
  Dashboard için `bull-board` ekle.

- [x] **SH-11** `ÖNEMLİ` **Cloudflare R2 / S3 Entegrasyonu** *(8 saat)*  
  Dosya yüklemeyi local disk'ten cloud storage'a taşı.  
  `@aws-sdk/client-s3` kullan. R2, S3 uyumlu ve daha ucuz.

- [x] **SH-12** `ÖNEMLİ` **Dosya Yükleme Güvenliği** *(3 saat)*  
  Yüklenen dosyanın MIME type kontrolü yap (sadece resim kabul et).  
  Dosya boyutu limiti koy (max 5MB). Dosya adını UUID ile rename et.

- [x] **SH-13** `ÖNEMLİ` **Ürün Varyantı Modeli** *(1 gün)*  
  `ProductVariant` tablosu ekle: renk, beden, materyal gibi özellikler.  
  Her varyantın kendi stoğu ve fiyatı olabilsin. `OrderItem`'da `variantId` referansı.

- [x] **SH-14** `ÖNEMLİ` **Çoklu Ürün Görseli** *(4 saat)*  
  `ProductImage` tablosu ekle. Bir ürüne birden fazla resim yüklenebilsin.  
  Sıra numarası ve primary resim alanı olsun.

- [x] **SH-15** `ÖNEMLİ` **Vergi Hesabı** *(4 saat)*  
  `Order` ve `OrderItem` modeline tax alanları ekle.  
  KDV dahil/hariç fiyat ayrımı yap. Vergi oranı ayarlardan okunabilsin.

- [x] **SH-16** `ÖNEMLİ` **Kupon / İndirim Sistemi** *(1 gün)*  
  `Coupon` tablosu ekle. Kod bazlı, yüzde veya sabit indirim.  
  Kullanım limiti, geçerlilik tarihi. Checkout'ta kupon uygulama endpoint'i.

- [x] **SH-17** `ÖNEMLİ` **İade Akışı** *(1 gün)*  
  `ReturnRequest` tablosu ekle. Müşteri iade talebi oluşturabilsin.  
  Admin onaylayınca stok geri gelsin, ödeme iadesi işaretlensin.

- [x] **SH-18** `ÖNEMLİ` **N+1 Sorgu Düzeltmesi** *(4 saat)*  
  Sipariş listesi, marketplace listesi gibi endpoint'lerde Prisma `include` ile eager loading yap.  
  100 siparişi 300 sorgu yerine 3 sorguda çek.

- [x] **SH-19** `ÖNEMLİ` **Veritabanı Index'leri** *(2 saat)*  
  `phone`, `businessId`, `createdAt`, `isActive` alanlarına btree index ekle.  
  Prisma şemasında `@@index` tanımla.

- [x] **SH-20** `ÖNEMLİ` **Kategori Silme Cascade** *(2 saat)*  
  Üst kategori silinince alt kategoriler ve ürünlerin davranışını tanımla.  
  Prisma `onDelete` ayarını kontrol et, `cascade` veya `restrict` koy.

- [x] **SH-21** `ÖNEMLİ` **Komisyon Race Condition** *(3 saat)*  
  Sipariş final statüye geçince komisyon kaydı oluşturuluyor.  
  Aynı anda çift tetikleme olursa çift komisyon oluşmasın. Unique constraint ekle.

- [x] **SH-22** `ÖNEMLİ` **SEO Meta Tag'leri** *(4 saat)*  
  Next.js App Router'da her sayfa için `metadata` export et.  
  Ürün sayfaları, kategori sayfaları için dinamik `title` ve `description`.

- [x] **SH-23** `ÖNEMLİ` **Favori / Wishlist** *(4 saat)*  
  `Wishlist` tablosu ekle. Müşteri ürünleri favorilere ekleyebilsin.  
  Hesap sayfasında listele.

- [x] **SH-24** `ÖNEMLİ` **Ürün Değerlendirme** *(6 saat)*  
  `Review` tablosu ekle. Satın alan müşteri yorum ve puan bırakabilsin.  
  Ortalama puan ürün kartında gösterilsin.

- [x] **SH-25** `ÖNEMLİ` **Refresh Token Interceptor** *(4 saat)*  
  Axios response interceptor'a 401 yakaladığında otomatik `/api/auth/refresh` çağrısı ekle.  
  `_retry` flag ile sonsuz döngüyü önle.

---

### 🟡 Orta Vadeli Görevler

- [x] **SH-26** `ORTA` **React Error Boundary** *(2 saat)*  
  Kritik sayfalara (checkout, cart, account) `ErrorBoundary` ekle.  
  Component hatası tüm sayfayı çökertmesin.

- [x] **SH-27** `ORTA` **React Query Cache Invalidation** *(3 saat)*  
  Sipariş oluşturulunca, ürün güncellenince ilgili query'leri invalidate et.  
  `queryClient.invalidateQueries` ile.

- [x] **SH-28** `ORTA` **Next.js Image Optimizasyonu** *(4 saat)*  
  Tüm ürün görsellerini `next/image` component'ine geçir.  
  Otomatik resize ve WebP dönüşümü için.

- [x] **SH-29** `ORTA` **Marketplace Cache** *(3 saat)*  
  Redis'e kategori listesi ve öne çıkan ürünleri cache'le. TTL: 5 dakika.  
  Sık değişmeyen veriler için DB yükünü azalt.

- [x] **SH-30** `ORTA` **Kargo Takip Numarası** *(2 saat)*  
  `Order` modeline kargo firması ve takip numarası alanları ekle.  
  Admin girebilsin, müşteri sipariş detayında görebilsin.

- [x] **SH-31** `ORTA` **Ürün CSV Import/Export** *(1 gün)*  
  Admin panelinde toplu ürün yükleme için CSV import.  
  Hatalı satırları raporla. Mevcut ürünleri export da olsun.

- [x] **SH-32** `ORTA` **Sipariş Takip Sayfası** *(4 saat)*  
  Müşteri `/account/orders` altında siparişlerini görebilsin.  
  Durum, tarih, tutar, kargo bilgisi görünsün.

- [x] **SH-33** `ORTA` **KVKK Anonimleştirme** *(6 saat)*  
  Kişisel veri silme talebi için anonimleştirme akışı.  
  İsim, telefon, e-posta sil ama finansal kayıtları tut.

- [x] **SH-34** `ORTA` **Bundle Analizi** *(2 saat)*  
  `next/bundle-analyzer` ekle.  
  Gereksiz büyük paketleri tespit et, dynamic import ile böl.

- [x] **SH-35** `ORTA` **Integration Testler** *(2 gün)*  
  Sipariş oluşturma, stok düşürme, ödeme akışı için `jest + supertest` ile integration test yaz.  
  Minimum kritik path coverage.

---

---

## 🏪 FAZ 1 — POS (KASA) MODÜLÜ

> Shopify ile paralel geliştirilebilir.  
> **Offline karar en kritik başlangıç noktası.**

---

### 🔴 Kritik Görevler

- [x] **POS-01** `KRİTİK` **Kasa Açılış/Kapanış** *(1 gün)*  
  `CashRegisterSession` tablosu ekle.  
  Kasa açılırken başlangıç nakit tutarı girilsin.  
  Kapanışta gün sonu hesaplansın.

- [x] **POS-02** `KRİTİK` **Gün Sonu Raporu** *(6 saat)*  
  Kasa kapanışında otomatik rapor oluştur: toplam satış, nakit/kart/havale ayrımı,  
  iptal sayısı, net ciro.

- [x] **POS-03** `KRİTİK` **Split Payment** *(6 saat)*  
  Tek siparişe birden fazla ödeme yöntemi (kart + nakit karma).  
  `Payment` tablosu zaten çoklu ödemeye uygun, frontend tarafını tamamla.

- [x] **POS-04** `KRİTİK` **POS İade Akışı** *(6 saat)*  
  POS'tan verilen siparişlerde iade işlemi.  
  Nakit iade veya kredi olarak müşteri bakiyesine ekle. Stok geri gelsin.

- [x] **POS-05** `KRİTİK` **Offline Karar ve PWA** *(2 gün)*  
  Internet kesilince kasa durmamalı.  
  PWA service worker ile temel satış işlemi offline çalışsın.  
  Bağlantı gelince sync olsun. IndexedDB ile lokal kuyruk.

---

### 🟠 Önemli Görevler

- [x] **POS-06** `ÖNEMLİ` **Fiş Yazdırma** *(1 gün)*  
  ESC/POS protokolü ile thermal printer entegrasyonu.  
  Alternatif: tarayıcı print API ile HTML fiş.  
  Fiş şablonu ayarlanabilir olsun.

- [x] **POS-07** `ÖNEMLİ` **Barkod Okuyucu** *(4 saat)*  
  POS ekranında input focus'ta barkod okuyucu girişini yakala.  
  Ürün barkodunu arayıp sepete ekle. Bulunamazsa uyar.

- [x] **POS-08** `ÖNEMLİ` **Müşteri Seçimi ve Bakiye** *(4 saat)*  
  POS'ta müşteri arama (telefon veya ad ile).  
  Seçilen müşterinin bakiyesini ödemeye uygulayabilme.

- [x] **POS-09** `ÖNEMLİ` **Kalem/Sepet İskonto** *(4 saat)*  
  POS'ta hem ürün bazlı hem sepet bazlı yüzde veya tutar indirimi uygulayabilme.  
  İskonto kaydı siparişe işlensin.

- [x] **POS-10** `ÖNEMLİ` **Vardiya Yönetimi** *(6 saat)*  
  Hangi personel hangi kasada çalıştı.  
  Kasa oturumu personel bazlı açılıp kapansın.  
  Personel bazlı satış raporu.

---

### 🟡 Orta Vadeli Görevler

- [x] **POS-11** `ORTA` **Satış Raporları** *(1 gün)*  
  Günlük, haftalık, aylık satış grafikleri.  
  Ürün bazlı satış sıralaması. Excel/PDF export.

- [x] **POS-12** `ORTA` **A4 Fatura Yazdırma** *(6 saat)*  
  Sipariş için A4 fatura şablonu.  
  Şirket bilgileri, müşteri bilgileri, KDV ayrımlı kalemler, toplam.

---

---

## ⚙️ DEVOPS — ALTYAPI VE DEPLOYMENT

> Faz 1 ile paralel ilerletilebilir.

- [x] **D-01** `ÖNEMLİ` **Docker Kurulumu** *(4 saat)*  
  Backend ve frontend için `Dockerfile` yaz.  
  `docker-compose` ile lokal geliştirme ortamı.  
  Tüm servisler (app, postgres, redis) tek komutla ayağa kalksın.

- [x] **D-02** `ÖNEMLİ` **GitHub Actions CI/CD** *(1 gün)*  
  Her PR'da lint ve test çalışsın.  
  Main branch'e merge olunca staging'e otomatik deploy.  
  Staging onayı sonrası production.

- [ ] **D-03** `ÖNEMLİ` **Cloudflare CDN** *(2 saat)*  
  Domain'i Cloudflare'e taşı.  
  Ücretsiz CDN, DDoS koruması, SSL otomatik.  
  Statik assetlar cache'lensin.

- [x] **D-04** `ÖNEMLİ` **Dependency Güvenlik Taraması** *(2 saat)*  
  `npm audit` ve Snyk CI'a entegre et.  
  Bilinen güvenlik açığı olan paket merge'e engelsin.

- [x] **D-05** `ORTA` **Load Testing** *(1 gün)*  
  k6 veya Locust ile production öncesi yük testi.  
  Sipariş endpoint'i, marketplace search, stok güncelleme senaryoları.

- [x] **D-06** `ORTA` **Monitoring Dashboard** *(1 gün)*  
  Grafana + Prometheus veya Datadog ile temel metrikler:  
  response time, error rate, DB connection pool, Redis memory.

- [x] **D-07** `ORTA` **Yönetilen PostgreSQL** *(4 saat)*  
  Local PostgreSQL yerine Railway, Supabase veya AWS RDS'e geç.  
  Otomatik backup, failover ve monitoring dahil.

---

---

## 📅 FAZ 2 — BOOKING (RANDEVU) SİSTEMİ

> Faz 1 production'a çıkıp ilk müşteriler alındıktan sonra başla.

---

### 🔴 Kritik Görevler

- [x] **BK-01** `KRİTİK` **Veri Modeli** *(1 gün)*  
  `WorkingHours`, `TimeSlot`, `ServiceType`, `BlockedDate` tablolarını ekle.  
  Prisma şemasını güncelle, migration çalıştır.

- [ ] **BK-02** `KRİTİK` **Müsaitlik Motoru** *(2 gün)*  
  Verilen tarih ve hizmet için müsait slotları hesaplayan servis.  
  Çalışma saatleri, engelli günler ve mevcut randevuları dikkate alsın.

- [ ] **BK-03** `KRİTİK` **Çakışma Kontrolü** *(1 gün)*  
  Randevu oluştururken aynı satıcı/personel için çakışma kontrolü yap.  
  Race condition'a karşı `SELECT FOR UPDATE` kullan.

- [ ] **BK-04** `KRİTİK` **Müşteri Self-Servis Randevu** *(2 gün)*  
  Satıcı profil sayfasında takvim ve slot seçimi.  
  Müşteri giriş yapmadan randevu görebilsin, oluşturmak için giriş gereksin.

---

### 🟠 Önemli Görevler

- [ ] **BK-05** `ÖNEMLİ` **Randevu Hatırlatma Cron Job** *(1 gün)*  
  BullMQ scheduled job ile 24 saat ve 1 saat öncesi hatırlatma e-postası.  
  SMS gateway entegrasyonu (Netgsm veya benzeri).

- [ ] **BK-06** `ÖNEMLİ` **İptal Politikası** *(4 saat)*  
  Kaç saat öncesine kadar iptal yapılabilir ayarı.  
  Geç iptal veya no-show için kural tanımlanabilsin.

- [ ] **BK-07** `ÖNEMLİ` **Satıcı Takvim Arayüzü** *(2 gün)*  
  Haftalık/günlük takvim görünümü. Randevuları renkli göster.  
  Çalışma saati ve tatil günü ayarlama.

- [ ] **BK-08** `ÖNEMLİ` **Online Ödeme ile Randevu** *(1 gün)*  
  Randevu oluştururken ödeme al.  
  Ödeme başarılıysa randevu kesinleşsin. Başarısız olursa randevu oluşmasın.

- [ ] **BK-09** `ÖNEMLİ` **Randevu Bildirimleri** *(6 saat)*  
  Oluşturuldu, onaylandı, iptal edildi, hatırlatma e-postaları.  
  Hem müşteriye hem satıcıya gönder.

- [ ] **BK-10** `ÖNEMLİ` **Bekleme Listesi** *(6 saat)*  
  Slot doluysa bekleme listesine eklenebilsin.  
  Randevu iptal olunca sıradaki kişiye bildirim gitsin.

- [ ] **BK-11** `ÖNEMLİ` **Yeniden Planlama** *(4 saat)*  
  Müşteri randevusunu belirli süre öncesine kadar yeniden planlayabilsin.  
  Yeni slot seçince eski iptal edilsin.

---

### 🟡 Orta Vadeli Görevler

- [ ] **BK-12** `ORTA` **Doluluk Oranı Raporu** *(4 saat)*  
  Satıcı için günlük/haftalık doluluk yüzdesi.  
  Boş kalan slotlar ve toplam ciro.

- [ ] **BK-13** `ORTA` **Tekrarlayan Randevu** *(1 gün)*  
  Haftalık veya aylık tekrarlayan randevu oluşturabilme.  
  Seriyi toplu iptal edebilme.

- [ ] **BK-14** `ORTA` **Google Calendar Sync** *(2 gün)*  
  Onaylanan randevuları Google Calendar'a ekle. OAuth2 ile.

---

---

## 🚗 FAZ 3 — UBER (TESLİMAT) SİSTEMİ

> En karmaşık faz.  
> **Mobil uygulama geliştirici olmadan bu faza girilmez.**

---

### 🔴 Kritik Görevler

- [ ] **UB-01** `KRİTİK` **Veri Modeli** *(1 gün)*  
  `Driver/Courier`, `DeliveryZone`, `DeliveryOrder`, `DriverLocation` tablolarını ekle.

- [ ] **UB-02** `KRİTİK` **WebSocket Altyapısı** *(2 gün)*  
  NestJS `@WebSocketGateway` ekle.  
  Socket.io ile kurye konum güncellemesi ve sipariş bildirimi kanalları.

- [ ] **UB-03** `KRİTİK` **Kurye Mobil Uygulaması** *(6–8 hafta)*  
  React Native veya Flutter ile mobil uygulama.  
  Sipariş listesi, konum paylaşımı, teslim teyidi.  
  ⚠️ Bu fazın en uzun kalemi.

- [ ] **UB-04** `KRİTİK` **FCM Push Notification** *(3 gün)*  
  Firebase Cloud Messaging entegrasyonu.  
  Kurye yeni sipariş atandığında, müşteri sipariş durumu değiştiğinde bildirim alsın.

- [ ] **UB-05** `KRİTİK` **Canlı Harita Takibi** *(3 gün)*  
  Müşteri sipariş takip ekranında kurye konumunu gerçek zamanlı gösteren harita.  
  Google Maps veya Mapbox.

---

### 🟠 Önemli Görevler

- [ ] **UB-06** `ÖNEMLİ` **Sipariş Atama Motoru** *(2 gün)*  
  Müsait en yakın kurye otomatik atansın.  
  Kurye kabul/red edebilsin. Reddederse sıradaki kurye denensin.

- [ ] **UB-07** `ÖNEMLİ` **ETA Hesaplama** *(1 gün)*  
  Tahmini teslimat süresi hesabı.  
  Google Maps Distance Matrix API ile güncel trafik dahil.

- [ ] **UB-08** `ÖNEMLİ` **Redis Pub/Sub Konum Yayını** *(2 gün)*  
  Kurye konum güncellemelerini Redis Pub/Sub üzerinden WebSocket'e ilet.  
  Ölçeklenebilir gerçek zamanlı mimari.

- [ ] **UB-09** `ÖNEMLİ` **Teslim Teyidi** *(1 gün)*  
  Kurye teslimatı fotoğraf veya imza ile teyit etsin.  
  Görsel S3'e yüklensin, siparişe bağlansın.

- [ ] **UB-10** `ÖNEMLİ` **Kapıda Ödeme** *(1 gün)*  
  Nakit veya POS cihazı ile kapıda ödeme seçeneği.  
  Kurye ödemeyi teslimatta kaydetsin.

---

---

## 📋 GENEL KURALLAR

> Bu kurallar projenin uzun vadeli sağlığı için zorunludur.

1. **Her görev commit'lenmeden bir sonrakine geçilmez.**  
   Yarım bırakılan iş teknik borç biriktirir ve tek kişilik projelerin en büyük tuzağıdır.

2. **Faz 0 atlanmaz.**  
   Güvenlik açıkları üzerine özellik inşa etmek ileride çok daha pahalıya mal olur.

3. **İlk müşteri Faz 1 biter bitmez alınır.**  
   Gerçek kullanım, teorik planlamadan çok daha fazla şey öğretir. Mükemmel beklemeden çıkarılır.

4. **Faz 3'e Faz 1 ve 2'deki gelir olmadan girilmez.**  
   Uber modülü mobil geliştirici gerektirir. Bu maliyet Faz 1-2'nin getireceği gelirle karşılanmalı.

5. **Her faz sonunda teknik borç sprint'i yapılır.**  
   Yeni özellik eklemeden önce o fazda biriken eksikler ve kodun okunabilirliği gözden geçirilir.

---

---

---

# 🤝 İŞ BÖLÜMÜ ANALİZİ — Diğer Geliştirici ile Çakışma Haritası

> **Karar:** Diğer geliştirici M0–M6 master planını yürütüyor.  
> Aşağıdaki tablolar hangi görevlerin çakıştığını ve bizim hangileri yapacağımızı netleştirir.  
> Çakışanlar diğer arkadaş bitirince beraber kontrol edilecek.

---

## ⚠️ ÇAKIŞANLAR — Diğer Geliştirici Üstleniyor

> Bu görevlere şimdilik dokunma. Bitince review yapılacak.

| Bizim Kodumuzdaki Görev | Çakışan M-Plan Görevi | Durum |
|------------------------|----------------------|-------|
| **S-01** IDOR Kontrolü (sipariş/müşteri/randevu) | **M0.1** Order CUSTOMER rolüne açma + **M0 Ek** Tenant izolasyonu | ⏸️ Bekle |
| **S-10** Cookie Secure/SameSite flag'leri | **M0.2** JWT HTTP-only cookie tamamlama / prod domain doğrulama | ⏸️ Bekle |
| **S-12** Cross-tenant businessId tutarlılığı | **M0 Ek** Prisma middleware ile global tenant filtresi | ⏸️ Bekle |
| **I-01** Redis Kurulumu (altyapı olarak) | **M0.5** Refresh token rotation + Redis token blacklist | ⏸️ Bekle |
| **SH-01** Sipariş Idempotency Key | **M5** Kupon çift uygulama idempotency + genel idem. mantığı | ⏸️ Bekle |
| **SH-02** Sipariş State Machine | **M1** iyzico sonrası order state machine (`INCOMPLETE → ACTIVE` vb.) | ⏸️ Bekle |
| **SH-06** Teslimat Adresi Modeli | **M2** Admin shipment akışı + adres/kargo takip | ⏸️ Bekle |
| **SH-07** Müşteri siparişi userId ile arama | **M2** Sipariş listesi/detay iyileştirmeleri | ⏸️ Bekle |
| **SH-13** Ürün Varyantı Modeli | **M3** ProductVariant DB + API + storefront + admin | ⏸️ Bekle |
| **SH-16** Kupon / İndirim Sistemi | **M5** Coupon/Campaign/CampaignRule tüm sistemi | ⏸️ Bekle |
| **SH-17** İade Akışı (ReturnRequest) | **M2** Kargo + iade akışı / teslimat durumları | ⏸️ Bekle |
| **SH-22** SEO Meta Tag'leri | **M4** UI tutarlılık turu (formatPrice/Date, sidebar state, RBAC) | ⏸️ Bekle |
| **SH-23** Favori / Wishlist | **M4** Customer account sayfaları tamamlama (zaten kısmi ✅) | ⏸️ Bekle |
| **SH-24** Ürün Değerlendirme (Review) | **M4** Customer account tamamlama + RBAC review turu | ⏸️ Bekle |
| **SH-25** Refresh Token Axios Interceptor | **M0.2** + **M0.5** JWT/cookie + token rotation frontend entegrasyonu | ⏸️ Bekle |
| **SH-33** KVKK Anonimleştirme | **M6** Abonelik yaşam döngüsü + veri yönetimi | ⏸️ Bekle |
| **POS-03** Split Payment | **M1** iyzico ödeme sağlayıcı entegrasyonu + Payment akışı | ⏸️ Bekle |
| **S-08** forgot-password rate limit | **M0.4** Rate limiting — login endpoint (aynı mekanizma, farklı endpoint) | ⚠️ Koordine Et |
| **S-05** Reset Token Invalidation | **M0.5** Logout token geçersizliği + server-side revoke | ⚠️ Koordine Et |

---

### ℹ️ Koordine Edilecekler (Yarı Çakışma)

| Görev | Neden Koordineli? |
|-------|------------------|
| **S-08** (forgot-password rate limit) vs **M0.4** (login rate limit) | Aynı throttle mekanizması — onun M0.4'ü bitmeden `forgotten-password`'a limit eklemek çakışabilir. Onu bitirince üstüne eklenir. |
| **S-05** (reset token sil) vs **M0.5** (token rotation + revoke) | Aynı `PasswordReset` tablosuna dokunan işlemler. M0.5 bitince S-05 review'u yapılır. |
| **I-01** Redis (genel altyapı) | M0.5 Redis kurar; biz sonradan BullMQ, cache için aynı instance'ı kullanırız. Kurulumunu o yapar. |

---

---

## ✅ BİZİM YAPTIKLARIMIZ — Çakışmasız Görevler

> Bu görevler diğer geliştiricinin planında yok. Direkt başlanabilir.

---

### 🔴 Bu Hafta Başla (Bloke Değil, Hemen Yapılabilir)

| Görev | Kodu | Süre | Neden Acil |
|-------|------|------|------------|
| Swagger production guard | **S-06** | 5 dk | 1 satır if, büyük risk kapatır |
| Helmet.js ekle | **S-07** | 10 dk | `npm i helmet` + `app.use(helmet())` |
| cartSlice negatif quantity | **#58** | 15 dk | `Math.max(1, qty)` — tek satır |
| npm audit / dependency scan | **D-04** | 30 dk | CI'a entegre et |
| bcrypt saltRounds kontrolü | **S-09** | 30 dk | Değeri kontrol + gerekirse 12'ye çıkar |
| Env variable validation | **I-03** | 2 saat | Startup Joi validasyonu |
| Health check endpoint | **I-04** | 1 saat | `/api/health` → DB ping |
| Dosya path traversal (UUID rename) | **#66** | 1 saat | Multer filename callback düzelt |
| Timing-safe token karşılaştırma | **#36** | 1 saat | `crypto.timingSafeEqual` |
| Aynı telefona çift User engeli | **S-11** | 1 saat | DB hatası yerine anlamlı mesaj |

---

### 🟠 Bu Ay (Bağımsız, Başlanabilir)

| Görev | Kodu | Süre |
|-------|------|------|
| SELECT FOR UPDATE (stok kilidi) | **S-02** | 3 saat |
| OrderItem fiyat + isim snapshot doğrulama | **S-03** | 2 saat |
| Telefon unique constraint (User tablosu) | **S-04** | 1 saat |
| findOrCreateForUser race condition | **SH-08** | 3 saat |
| Sipariş iptalinde stok geri yükleme | **SH-03** | 3 saat |
| Soft delete (deletedAt) | **SH-04** | 6 saat |
| Stale cart fiyat kontrolü (checkout) | **SH-05** | 4 saat |
| Komisyon race condition (unique constraint) | **SH-21** + **#22** | 3 saat |
| Bakiye + transaction güvencesi | **#34** | 1 gün |
| Süresi dolan refresh token temizleme (cron) | **#26** | 4 saat |
| Transaction timeout ayarı | **#63** | 2 saat |
| Connection pool boyutu (DATABASE_URL) | **#64** | 2 saat |
| Seller public endpoint userId sızıntısı | **#65** | 2 saat |
| Komisyon floating point → Math.round | **#71** | 4 saat |
| Telefon carrier recycling (doğrulama adımı) | **#25** | 1 gün |
| Kategori silme cascade (onDelete) | **SH-20** + **#68** | 4 saat |
| Telefon unique constraint (User) | **#69** | 2 saat |
| Order status geçiş state machine (bizim kapsamımız) | **#70** | — |
| Cross-tenant: diğer arkadaş bitirince gap kapat | **S-12** → Review | — |

---

### 🟡 3 Ay İçinde (Bağımsız)

| Görev | Kodu | Süre |
|-------|------|------|
| Sentry entegrasyonu | **I-02** | 2 saat |
| .env.example dosyası | **I-05** | 1 saat |
| Staging ortamı | **I-06** | 4 saat |
| PostgreSQL backup (pg_dump + cron) | **I-07** | 3 saat |
| PM2 cluster mode | **I-08** | 30 dk |
| Structured logging (Winston/Pino) | **I-09** | 3 saat |
| API versiyonlama (/api/v1/) | **I-10** | 4 saat |
| N+1 sorgu düzeltmesi (Prisma include) | **SH-18** + **#41** | 4 saat |
| Veritabanı index'leri | **SH-19** + **#42** | 2 saat |
| Observability (Sentry + Winston) | **#31** | — |
| React Error Boundary | **SH-26** + **#49** | 2 saat |
| React Query cache invalidation | **SH-27** + **#50** | 3 saat |
| Next.js Image optimizasyonu | **SH-28** + **#51** | 4 saat |
| Marketplace Redis cache | **SH-29** + **#16** | 3 saat |
| Sipariş e-posta bildirimi | **SH-09** | 6 saat |
| BullMQ + Redis queue | **SH-10** | 6 saat |
| Dosya yükleme güvenliği (MIME/boyut) | **SH-12** | 3 saat |
| Cloudflare R2 / S3 entegrasyonu | **SH-11** | 8 saat |
| Çoklu ürün görseli (ProductImage) | **SH-14** | 4 saat |
| Ürün CSV import/export | **SH-31** | 1 gün |
| Sipariş takip sayfası (/account/orders) | **SH-32** | 4 saat |
| console.log → NestJS Logger | **#72** | 3+ saat |
| isActive filtresi tutarlılık turu | **#74** | 4 saat |
| Hata mesajı standardizasyonu | **#83** | 3 saat |
| Randevu double booking (OVERLAPS) | **#28** | 1 gün |
| React hydration mismatch | **#48** | 2 saat |
| Bundle analizi | **SH-34** + **#81** | 2 saat |
| Integration testler | **SH-35** | 2 gün |

---

### 🏪 POS Modülü (Diğer Geliştirici ile Çakışmıyor)

| Görev | Kodu | Süre |
|-------|------|------|
| Kasa açılış/kapanış (CashRegisterSession) | **POS-01** | 1 gün |
| Gün sonu raporu | **POS-02** | 6 saat |
| POS iade akışı | **POS-04** | 6 saat |
| Offline PWA + IndexedDB | **POS-05** | 2 gün |
| Fiş yazdırma | **POS-06** | 1 gün |
| Barkod okuyucu | **POS-07** | 4 saat |
| Müşteri seçimi + bakiye | **POS-08** | 4 saat |
| Kalem/sepet iskonto | **POS-09** | 4 saat |
| Vardiya yönetimi | **POS-10** | 6 saat |
| Satış raporları | **POS-11** | 1 gün |
| A4 fatura yazdırma | **POS-12** | 6 saat |
| **Split Payment** — M1 bittikten sonra | **POS-03** | 6 saat |

> ⚠️ POS-03 (Split Payment) M1 iyzico bittikten sonra koordineli yapılacak.

---

### ⚙️ DevOps (Bağımsız)

| Görev | Kodu | Süre |
|-------|------|------|
| Docker + docker-compose | **D-01** | 4 saat |
| GitHub Actions CI/CD | **D-02** | 1 gün |
| Cloudflare CDN | **D-03** | 2 saat |
| Load testing (k6/Locust) | **D-05** | 1 gün |
| Monitoring dashboard (Grafana) | **D-06** | 1 gün |
| Yönetilen PostgreSQL (Railway/RDS) | **D-07** | 4 saat |

---

### 📅 Booking + 🚗 Uber (Tamamen Bizim — Diğer Geliştirici Planında Yok)

Faz 2 (BK-01…BK-14) ve Faz 3 (UB-01…UB-10) tamamen bizim planımızda, diğer geliştiricinin M-planında bu fazlar hiç geçmiyor. Faz 1 bitince başlanacak.

---

---

## 📋 ÇAKIŞANLAR — Diğer Arkadaş Bitirince Kontrol Listesi

> Bu görevler teslim alındığında aşağıdaki noktalar gözden geçirilecek:

- [ ] **M0.1 bitti** → S-01 (IDOR) review: sipariş/müşteri/randevuda businessId + customerId çift kontrolü tam mı?
- [ ] **M0.2 bitti** → S-10 (Cookie flags) review: `Secure: true`, `SameSite: Strict/None` doğru mu? Staging'de test edildi mi?
- [ ] **M0.4 bitti** → S-08 ekle: `forgot-password` endpoint'ine aynı throttle mekanizmasını ekle (15dk/3 istek)
- [ ] **M0.5 bitti** → S-05 review: eski reset tokenlar invalidate ediliyor mu? Redis blacklist doğru çalışıyor mu? Ardından I-01 Redis kurulumunu BullMQ için genişlet
- [ ] **M0 Ek bitti** → S-12 review: Prisma middleware ile her query'de `businessId` enjekte ediliyor mu? Yeni endpoint'lerde test yap
- [ ] **M1 bitti** → POS-03: Split payment frontend tarafını tamamla. SH-02 (state machine) ile çakışma var mı kontrol et
- [ ] **M2 bitti** → SH-06 (adres modeli) ve SH-07 (userId ile arama) doğrula. SH-17 (iade) kapsamı M2'yi aştıysa ReturnRequest modeli ekle
- [ ] **M3 bitti** → SH-13 review: ProductVariant API'ı tamamlandı mı? OrderItem'da variantId referansı var mı? SH-14 (çoklu görsel) M3 kapsamında mı kaldı?
- [ ] **M4 bitti** → SH-22 (SEO) tamamlandı mı? SH-23 (wishlist) ve SH-24 (review) M4'te mi kaldı yoksa ayrı milestone mı gerekiyor?
- [ ] **M5 bitti** → SH-16 review: Coupon/Campaign sistemi SH-01 (idempotency) kapsamında mı çözüldü? Aynı kuponun çift uygulanması engellendi mi?
- [ ] **M6 bitti** → SH-33 (KVKK) review: abonelik iptali = kişisel veri anonimleştirme akışı var mı?
- [ ] **M0.5 + I-01 bitti** → BullMQ için aynı Redis instance kullan. `SH-10` (queue) başlat.
- [ ] **SH-25 bitti** → Axios refresh interceptor test et: 15dk sonra token expire olunca aktif form kaybolmuyor mu?

---

*Bu doküman 2026-02-21 tarihinde oluşturulmuştur. Kodda yapılan değişikliklerle birlikte güncellenmelidir.*
