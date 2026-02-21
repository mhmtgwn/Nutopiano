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
✅ Easier to navigate codebase
✅ Better code reusability
✅ Cleaner imports and organization
✅ Easier onboarding for new developers
✅ Production-ready structure
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
