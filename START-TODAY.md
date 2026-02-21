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

✅ **Bitti**: Testler `curl -H "Origin: http://evil.com" http://localhost:3001/api/...` ile başarısız olmalı

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
    expiresIn: '15m'  // ✅ 15 dakika sonra geçersiz
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

✅ **Bitti**: Token expire olup olmadığını test et: `jwt.io` sitesinde token'ı decode et, `exp` alanını kontrol et

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

✅ **Bitti**: Test et → `POST /auth/register` ile "abc123" şifresi REJECTED olmalı ✅

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

✅ **Bitti**: Test et → Email olmayan "@xyz" hatalı olmalı ✅

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

✅ **Bitti**: Test et → 2 concurrent request ile aynı ürün sipariş edilse, biri FAILED olmalı ✅

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

**Çıktı**: ✅ Tüm testler geçmeleri (`PASS: 53 tests`)

---

### Gün 2 (19 Şubat - Çarşamba)

- [ ] **09:00-10:00** Code review & bug fixes
- [ ] **10:00-11:00** Database migration oluştur: `npx prisma migrate dev --name security_updates`
- [ ] **11:00-12:00** `.env` dosyasını güncelle (CORS, JWT, etc.)
- [ ] **12:00-13:00** Lunch
- [ ] **13:00-14:00** Dev ortamında test: `npm run start:dev`
- [ ] **14:00-15:00** E2E testleri çalıştır: `npm run test:e2e`

**Çıktı**: ✅ Local dev'de hata yok, DB migration clean

---

### Gün 3 (20 Şubat - Perşembe)

- [ ] **09:00-10:00** Staging'e deploy et ve test
- [ ] **10:00-11:00** Security scan: `npm audit`
- [ ] **11:00-12:00** Documentation güncellemesi
- [ ] **12:00-13:00** Lunch
- [ ] **13:00-14:00** Team memo yazma (değişiklikler ve migration adımları)
- [ ] **14:00-15:00** Final testler ve approval

**Çıktı**: ✅ Production hazır, deployment plan ready

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
