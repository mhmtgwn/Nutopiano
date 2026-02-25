# 🎨 Nutopiano — Admin & POS Panel UI Geliştirme Planı

> **Oluşturulma:** 2026-02-25  
> **Durum:** Aktif  
> **Kapsam:** Admin Shell, Seller Shell, POS Sayfası, Dashboard tasarımları

---

## 🔴 ACİL BUGLAR (Hemen Düzeltilmeli)

### BUG-1: Admin Dashboard'da Çift Bölme Hatası
**Dosya:** `frontend/src/app/admin/page.tsx` — satır 262, 298

```ts
// YANLIŞ (mevcut):
formatPrice(summary.revenueTodayCents / 100)   // formatPrice zaten /100 yapıyor!
formatPrice(reports.revenueCents / 100)         // aynı sorun

// DOĞRU:
formatPrice(summary.revenueTodayCents)          // formatPrice içinde /100 yapıyor
formatPrice(reports.revenueCents)
```

`formatPrice(cents)` fonksiyonu `cents / 100` yaparak TL'ye çeviriyor.
Admin page bu değerleri TEKRAR `/ 100` yaparak geçiriyor → **100x düşük fiyat gösteriyor**.

**Etki:** "Bugün ciro: 0,10₺" (aslında 10₺ olması gerekirken)

---

### BUG-2: POS'ta "Açılış Nakit" Kullanıcı Karışıklığı  
**Dosya:** `frontend/src/app/pos/page.tsx` — satır 2242

Input label'ı "Açılış Nakit (kurus)" diyor ama kullanıcı bunu TL olarak girebilir.
Validasyon yok, negatif giriş sadece toast hatası veriyor ama form gönderilebiliyor.

**Düzeltme:** Label'a örnek değer ekle, TL cinsinden al ve 100 çarp.

---

### BUG-3: POS'ta Sipariş Oluşturmada Çift Tıklama Riski
**Dosya:** `frontend/src/app/pos/page.tsx` — satır 1943

`handleCreateSale` fonksiyonunda `isSubmitting` state'i var ama
asenkron `ensureShiftSession()` çağrısı öncesi buton dizablı değil.
Shift kontrolü sürerken ikinci tıklama geçebilir.

---

## 🟡 TASARIM SORUNLARI (Bu Plan Kapsamı)

### SORUN-1: AdminShell Tasarımı — Genel
- **Sidebar:** Düz beyaz. Derinlik, arka plan rengi, gölge yok.
- **Nav öğeleri:** 11px uppercase küçük font, okunması zor.
- **Aynı ikon:** Users ikonu 4 farklı öğede (Kullanıcılar, Müşteriler, Satıcılar, Satıcı Başvuru).
- **Dil tutarsızlığı:** "Finance", "Risk" İngilizce; diğerleri Türkçe.
- **max-w-6xl:** Geniş ekranlarda içerik sıkışıyor.
- **Header:** Mobile'da hiç başlık göstermemiyor (`hidden lg:block`).
- **Sidebar 240px:** Uzun nav öğe isimleri ("Mismatch Monitor") kesilmiyor mu?

### SORUN-2: SellerShell Tasarımı
- Admin Shell ile neredeyse aynı kod (DRY ihlali), farklı renk şeması yok.
- Dashboard header `"Dashboard"` yazıyor — sayfa içeriğiyle çakışıyor.

### SORUN-3: Admin Dashboard Sayfası
- 8 stat kartı düz beyaz, ikon ve sayıdan ibaret. Trend bilgisi yok.
- "Hero" section: gradient var ama çok soluk.
- Tablo header'ları çok küçük (10px).

### SORUN-4: POS Sayfası — Kritik Layout
- **3608 satır tek dosya** — bölünmesi şart.
- **Tam sayfa scroll** — gerçek kasa uygulaması sabit viewport olmalı.
- **Sepet ve özet paneli** — `xl` breakpoint'e kadar üst üste geliyor.
- **Kasa özeti paneli** rengi çok soluk, dikkat çekmiyor.
- **Ödeme metodları** — sayfanın altına kadar kaymak gerekiyor.
- POS'ta kendi navigation'ı yok, SellerShell ile entegre değil.

---

## 📋 PLAN: FAZ 1 — Acil Buglar (1-2 saat)

### Görev 1.1: Admin Dashboard Fiyat Hatası Düzelt
**Dosya:** `frontend/src/app/admin/page.tsx`

Değiştirilecek satırlar:
```ts
// satır 262 — revenueTodayCents zaten cents, /100 kaldır:
value: summary ? formatPrice(summary.revenueTodayCents) : '-',

// satır 298 — revenueCents zaten cents, /100 kaldır:
value: reports ? formatPrice(reports.revenueCents) : '-',
```

### Görev 1.2: POS Açılış Nakit Label Düzelt
**Dosya:** `frontend/src/app/pos/page.tsx`
Label'ı "Açılış Nakit (TL)" yap, placeholder'ı "0,00" yap.

---

## 📋 PLAN: FAZ 2 — Admin Shell Yeniden Tasarımı (4-6 saat)

### Hedef Görünüm
- **Koyu sidebar** (dark green `#0F2420`) → beyaz metin, aktif item highlight
- **Modern navigasyon** — büyük ikonlar (20px), okunabilir font (13px), gruplu menü
- **Top navbar** — breadcrumb, kullanıcı avatarı, çıkış butonu
- **İçerik alanı** — `max-w-7xl`, sidebar genişliği `260px`

### Tasarım Kararları
```
┌─────────────────────────────────────────┐
│  LOGO   Admin Panel     [User] [Logout]  │  ← Top navbar (h-14, bg-white, border-b)
├────────────┬────────────────────────────┤
│            │                            │
│  Sidebar   │   Content Area             │
│  260px     │   max-w-none               │
│  bg:#0F2420│   bg: #F8F9FA              │
│            │                            │
│ 📊 Merkez  │   [page content]           │
│  Genel     │                            │
│  Bakış     │                            │
│            │                            │
│ 📦 Katalog │                            │
│  Ürünler   │                            │
│            │                            │
└────────────┴────────────────────────────┘
```

### Değişiklikler

**AdminShell.tsx:**
1. `bg-white` → `bg-[#F8F9FA]` (sayfa arka planı)
2. Sidebar: `bg-white` → `bg-[#0F2420]` (koyu yeşil)
3. Nav metin: `text-white/70` → `text-white` aktif durumda
4. Nav ikon boyutu: `h-4 w-4` → `h-5 w-5`
5. Nav font: `text-[11px]` → `text-[13px]` (uppercase kaldır, normal case)
6. `max-w-6xl` → `max-w-[1440px]`
7. Sidebar genişliği: `240px` → `260px`
8. Top navbar ekle: logo + panel adı + kullanıcı + logout
9. İngilizce section başlıklarını Türkçe'ye çevir

**Nav ikon değişiklikleri:**
- Kullanıcılar: `UserCog` (mevcut Users yerine)
- Müşteriler: `UserCheck`
- Satıcılar: `Store`
- Satıcı Başvuru: `FileCheck`
- Finance → `Banknote` (mevcut Landmark yerine)
- Risk → `ShieldAlert`

---

## 📋 PLAN: FAZ 3 — Seller Shell Yeniden Tasarımı (2-3 saat)

### Hedef
- Admin Shell ile aynı koyu sidebar anlayışı ama farklı renk: `#7A4B00` (kahverengi-turuncu)
- Dashboard içerik başlığı `"Dashboard"` → `"Seller Paneli"`
- Mobile nav: bottom tab bar style (POS, Siparişler, Dashboard)

---

## 📋 PLAN: FAZ 4 — POS Sayfası Yeniden Mimarisi (8-12 saat)

### Sorun: 3608 Satır Monolitik Dosya
POS sayfasını component'lere böl:

```
pos/
├── page.tsx              ← Ince orchestrator (state yönetimi)
├── components/
│   ├── PosHeader.tsx     ← Başlık, online/offline badge, shift status
│   ├── PosCart.tsx       ← Sepet listesi ve ürün ekleme
│   ├── PosCheckout.tsx   ← Müşteri seçimi + ödeme paneli
│   ├── PosNumpad.tsx     ← Sayısal tuş takımı (yeni)
│   ├── PosShift.tsx      ← Vardiya açma/kapama
│   ├── PosReports.tsx    ← Satış raporları
│   └── PosReceipt.tsx    ← Fiş/fatura bölümü
```

### Hedef Layout (Sabit Viewport)
```
┌─────────────────────────────────────────────┐
│ POS | Vardiya: MAIN | 🟢 Online | Kuyruk: 0 │  ← Sabit header (h-12)
├──────────────────────┬──────────────────────┤
│                      │                      │
│   ÜRÜN ARAMA         │   KASA ÖZETİ         │
│   + SEPET            │   + ÖDEME            │
│                      │   + MÜŞTERİ         │
│   (scroll edilebilir)│   (sabit sağ panel)  │
│                      │                      │
│                      │  [ SATIŞ YAP ]       │
│                      │  büyük yeşil buton   │
└──────────────────────┴──────────────────────┘
```

### Tasarım Özellikleri
- **Sol panel:** `flex-1`, scroll edilebilir, ürün arama, sepet listesi
- **Sağ panel:** `w-[360px]`, sabit, overflow yok, her zaman görünür
- **Sağ panel içeriği:** Özet → Müşteri → Ödeme → Büyük Satiş Yap butonu
- **Satiş Yap Butonu:** Tam genişlik, yüksek (h-14), belirgin yeşil
- **Numpad:** Miktar girişi için dokunmatik numpad (tablet/mobil için)
- **Renk paleti:** Koyu yeşil başlık, beyaz içerik, yeşil highlight

---

## 📋 PLAN: FAZ 5 — Admin Dashboard Modernizasyonu (3-4 saat)

### Stat Kartları
Mevcut (düz sayı) → Geliştirilmiş (trend + değişim):
```
┌─────────────────────┐
│ 📦 Bugün Sipariş    │
│                     │
│    142              │ ← Büyük sayı
│    +12% dün         │ ← Trend badge (yeşil/kırmızı)
│ Son 24 saat         │ ← Küçük açıklama
└─────────────────────┘
```

### Dashboard Layout Geliştirme
- Stat kartlarına renkli sol border (durum göstergesi)
- Siparişler tablosuna renk kodlu status badge'leri
- Quick Links → daha büyük, ikonlu kartlar
- Risk skoru → daha görünür, gauge/progress bar

---

## 📋 UYGULAMA ÖNCELİĞİ

| Öncelik | Görev | Tahmini Süre | Etki |
|---------|-------|-------------|------|
| 🔴 P0 | BUG-1: Fiyat çift bölme düzelt | 15 dk | Kritik |
| 🔴 P0 | BUG-2: POS label düzelt | 15 dk | Yüksek |
| 🟠 P1 | AdminShell koyu sidebar | 3 saat | Yüksek |
| 🟠 P1 | SellerShell yeniden tasarım | 2 saat | Yüksek |
| 🟡 P2 | Admin Dashboard modernize | 3 saat | Orta |
| 🟡 P2 | POS sabit viewport layout | 4 saat | Yüksek |
| 🟢 P3 | POS component ayrıştırma | 8 saat | Teknik |
| 🟢 P3 | POS numpad komponenti | 2 saat | Orta |

---

## 🎨 YENİ TASARIM SİSTEMİ (Panel'e Özel)

```css
/* Admin Panel Renk Paleti */
--panel-sidebar-bg: #0F2420;        /* Koyu yeşil */
--panel-sidebar-text: #FFFFFF;
--panel-sidebar-muted: rgba(255,255,255,0.55);
--panel-sidebar-active-bg: rgba(255,255,255,0.12);
--panel-sidebar-hover-bg: rgba(255,255,255,0.06);
--panel-sidebar-border: rgba(255,255,255,0.08);

--panel-topbar-bg: #FFFFFF;
--panel-topbar-border: #E5E7EB;

--panel-content-bg: #F8F9FA;
--panel-card-bg: #FFFFFF;
--panel-card-border: #E5E7EB;

/* Seller/Dashboard Panel Renk Paleti */
--seller-sidebar-bg: #2C1810;       /* Koyu kahve */
--seller-sidebar-active-bg: rgba(255,255,255,0.15);

/* POS Panel Renk Paleti */
--pos-header-bg: #0D2D25;
--pos-right-panel-bg: #F0F7F4;
--pos-cta-bg: #1A6B4E;
--pos-cta-hover-bg: #155940;
```

---

## 📌 NOTLAR

1. Tüm değişiklikler mevcut backend API'leriyle uyumlu — veri katmanı değişmiyor.
2. AdminShell ve SellerShell refactor'ları potansiyel olarak `platform/` rotasını da etkiler — test et.
3. POS component ayrıştırması state'i `page.tsx`'te tutar, child'lara prop geçer (Context kullanmadan).
4. Mobil responsive test: Admin 768px+ sidebar göster, POS 640px'te tek sütun moda geç.
