# Nutopiano Admin Paneli — Doğrulama Raporu

> Tarih: 2026-02-28  
> Kapsam: `plans/admin-panel-planlama.md` görevlerinin kodda karşılığı + admin panellerde özellik çalışırlığı  
> Durum: **Tamamı çalışıyor değil** (kritik sözleşme uyumsuzlukları var)

---

## 1. Yöntem

Aşağıdaki kontroller çalıştırıldı:

- Plan checklist sayımı (`[x]` / `[ ]`)
- Frontend admin route ve dosya varlık kontrolü
- Backend modül/model/controller varlık kontrolü
- Frontend <-> Backend endpoint sözleşme karşılaştırması (örneklem + kritik akışlar)
- Build, lint, e2e test çalıştırma

---

## 2. Otomatik Çalıştırma Sonuçları

### 2.1 Plan checklist sayımı

- Toplam görev: **51**
- İşaretli: **38**
- İşaretsiz: **13**

İşaretsiz maddeler (doküman durumu):

- Yetki sistemi genişletme (granüler)
- Permission group modeli
- Feature flag modeli/servisi
- AdminShell 3 katmanlı nav
- DataTable
- FilterPanel
- Error boundary
- Soft delete altyapısı
- Güvenlik dashboard (opsiyonel)
- Kategori drag-drop (opsiyonel)
- Payout iyileştirme
- Quota izleme
- Sistem sağlığı dashboard entegrasyonu

Not: Bu maddelerin bir kısmı kodda var ama dokümanda güncellenmemiş.

### 2.2 Derleme ve lint

- `npm run build -w backend`: **PASS**
- `npm run build -w frontend`: **PASS**
- `npm run lint -w backend`: **PASS (0 error, çok sayıda warning)**
- `npm run lint -w frontend`: **PASS (0 error, 127 warning)**

### 2.3 Testler

- `npm run test:e2e -w backend`: **FAIL**
- Sonuç: **14 suite / 12 pass / 2 fail**, **101 test / 98 pass / 3 fail**
- Fail suite:
  - `seller-mvp.e2e-spec.ts` (403 beklenirken 201)
  - `role-isolation-smoke.e2e-spec.ts` (403 beklenirken 200 + audit beklentisi fail)

- `npm run test:e2e:ui -w frontend`: **2 test SKIPPED**
  - Admin panelini doğrulayan Playwright senaryosu yok.

---

## 3. Faz Bazlı Doğrulama Özeti

## Faz 1 — Temel Altyapı

- Granüler permission enum/guard: **Kısmi (kod var, davranışta kırıklar var)**
  - `backend/src/common/constants/permissions.ts`
  - `backend/src/common/guards/permission.guard.ts`
  - E2E role isolation fail bunu doğruluyor.
- PermissionGroup modeli/servisi: **Var**
- FeatureFlag modeli/servisi: **Var**
- AdminShell 3 katmanlı nav: **Var**
- DataTable/FilterPanel: **Var ve yaygın kullanımda**
- Route-level error boundary: **Eksik** (`admin` altında `error.tsx/loading.tsx` yok)
- Soft delete: **Kısmi** (model ve bazı servislerde var, tüm akışlar tutarlı değil)

## Faz 2 — Kullanıcı & Yetki Yönetimi

- Kullanıcı liste/detay sayfaları: **Var ama detayda placeholder mevcut**
- Roller & yetkiler: **Statik UI** (gerçek CRUD/matris yönetimi değil)
- Permission groups UI: **Var ama backend contract uyumsuzluğu riski yüksek**
- Audit log UI: **Var ama endpoint path uyumsuz** (`/audit-logs` vs backend `/platform/audit/logs`)

## Faz 3 — Güvenlik

- 2FA backend: **Var**
- 2FA frontend entegrasyonu: **Eksik/Kısmi** (frontend’de `/auth/2fa` çağrısı yok)
- Impersonation backend: **Var**
- Impersonation frontend entegrasyonu: **Eksik/Kısmi**
  - Banner component var ama kullanılmıyor.
  - Kullanıcı detayında buton disabled placeholder.
- Güvenlik dashboard: **Var** (`/health/admin-dashboard` ile)

## Faz 4 — Satıcı Yönetimi

- Satıcı listesi/detay/başvurular/staff sayfaları: **Var**
- Satıcı detayında impersonation butonu: **Yok**

## Faz 5 — Ürün/Kategori

- Ürün yönetimi + CSV + arşiv: **Var**
- Kategori drag-drop: **Yok (opsiyonel madde hâlâ açık)**

## Faz 6 — Sipariş/Müşteri

- Sipariş ve müşteri admin sayfaları: **Var**
- Sipariş detayında config snapshot görünümü: **Belirgin değil/eksik**
- Müşteri detay “bakiye yönetimi” endpoint uyumsuz (`/customers/{id}/credit` backendde yok)

## Faz 7 — Finans

- Sayfalar var: ledger/wallets/refunds/mismatch
- Ancak bu sayfaların çağırdığı endpointler çoğunlukla **yanlış namespace** (`/admin/finance/*`), backend `/platform/finance/*`
- Payout sayfası `/platform/finance/payouts` kullandığı için daha tutarlı

## Faz 8 — İletişim

- Email/SMS template backend+frontend: **Var**
- Template test gönderimi: **Var** (`/email-templates/:id/test`, `/sms-templates/:id/test`)
- SMTP/SMS bağlantı test endpointleri (`/smtp/test`, `/sms/test`): **Yok**
- Quota izleme: **Yok**

## Faz 9 — Governance

- Feature flags: **Var**
- API key yönetimi: **Var**
- Notification center: **Kısmi/Kırık** (frontend-backend veri modeli uyuşmuyor)
- Sistem sağlığı entegrasyonu: **Kısmi** (security dashboard var, plan endpointleri birebir değil)

## Faz 10 — Raporlar/Denetim

- Raporlar sayfası UI var ama `/admin/reports/*` backend endpointleri yok
- Outbox UI var ama `/outbox-events` endpointleri backendde yok (`/platform/outbox/events` var)
- Export bazı alanlarda var, ama endpoint eşleşmesi homojen değil

---

## 4. Kritik Bulgular (Çalışırlığı Doğrudan Etkileyen)

1. **Frontend-backend endpoint sözleşme uyumsuzlukları (çok sayıda)**
- Frontend:
  - `/admin/finance/ledger`, `/admin/finance/wallets`, `/admin/finance/refunds`, `/admin/finance/mismatch`
  - `/admin/reports/*`
  - `/audit-logs`, `/outbox-events`
- Backend karşılığı:
  - `/platform/finance/ledger`, `/platform/finance/wallets`, `/platform/finance/refunds`, `/platform/risk/price-mismatches`
  - `/platform/audit/logs`, `/platform/outbox/events`
- Sonuç: İlgili panellerde veri çekme/aksiyonlar fail olur.

2. **Notification Center veri modeli uyuşmuyor**
- Backend `notifications` modeli: `type/title/message/source/isRead...`
- Frontend `notifications` sayfası: `body/channel/targetType/status/sentAt...` bekliyor + `/notifications/:id/send` çağırıyor (backendde yok)
- Sonuç: listeleme/oluşturma/gönderim davranışı bozuk.

3. **2FA ve impersonation frontend akışı tamamlanmamış**
- Kullanıcı detay sayfasında placeholder metinler var.
- `ImpersonationBanner` componenti kodda var ama hiçbir yerde render edilmiyor.
- Frontend’de `/auth/2fa` çağrısı yok.

4. **Role/permission davranışı testte kırık**
- Backend e2e’de rol izolasyonu testleri fail (403 beklenen yerlerde başarılı dönüş).
- Bu, “yetki sistemi tamam” iddiasını düşürüyor.

5. **Admin kullanıcı oluşturma UI endpointi eksik**
- Frontend `POST /users` kullanıyor.
- `UsersController` içinde `@Post()` yok.

---

## 5. Panel Bazında Çalışırlık Değerlendirmesi

- **Çalışır / büyük ölçüde çalışır**
  - Ana admin route yapısı, sidebar, çok sayıda UI ekranı
  - Build seviyesinde compile hatası yok
  - Payout ana akışı (platform finance endpointleriyle)
  - API key yönetimi (genel iskelet)

- **Kısmi / riskli**
  - Permission groups
  - Feature flags
  - Security dashboard
  - SMTP/SMS ayarları
  - Sipariş/müşteri detay zengin özellikleri

- **Çalışmıyor veya ciddi sözleşme riski var**
  - Ledger / Wallet / Refund / Mismatch bağımsız admin sayfaları
  - Audit log sayfası
  - Outbox olayları sayfası
  - Reports sayfası backend bağlantıları
  - Notification center ileri fonksiyonları
  - User detail içindeki 2FA/impersonation akışları

---

## 6. Net Sonuç

`plans/admin-panel-planlama.md` içindeki görevlerin **tamamının yapıldığı doğrulanamadı**.  
Kod tabanında çok sayıda özellik eklenmiş olsa da, panel seviyesinde “çalışıyor” demek için kritik engeller var:

- endpoint namespace/sözleşme uyuşmazlıkları,
- placeholder kalan güvenlik özellikleri,
- başarısız role-isolation e2e testleri,
- admin paneline özel e2e test kapsamasının olmaması.

Bu haliyle sistem: **“UI kapsamı yüksek, entegrasyon kalitesi orta-düşük”**.

---

## 7. Öncelikli Aksiyon Listesi (Önerilen Sıra)

1. Frontend admin API path’lerini backend ile tek sözleşmeye çek (`/platform/*` vs `/admin/*` dağınıklığını bitir).
2. Notification, ConfigSnapshot, PermissionGroup request/response şemalarını tek tip hale getir.
3. `role-isolation` ve `seller-mvp` e2e fail nedenlerini düzeltmeden deploy etme.
4. 2FA ve impersonation için gerçek UI akışını bağla (placeholder kaldır).
5. Admin için kritik smoke e2e seti ekle (orders/customers/finance/audit/outbox/notifications).

