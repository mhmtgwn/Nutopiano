# NUTOPIANO — UX/UI MİMARİ DOKÜMANI

Tarih: 24 Şubat 2026  
Versiyon: 1.0  
Durum: Tasarım Referansı

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SİSTEM KİMLİĞİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bu sistem basit bir e-ticaret arayüzü değil.
Shopify + POS + Finance Core + Risk Monitor bütünü.

Üç farklı persona için tasarlanıyor:

  [A] Seller         — operasyon odaklı
  [B] Finance/Admin  — kontrol ve risk odaklı
  [C] POS Kullanıcısı — hız ve hata toleransı odaklı


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. GENEL UX FELSEFESİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sistemde dört kavram birbirine karışmamalı:

  1. Operasyon    → sipariş oluşturma
  2. Para         → ledger, payout, komisyon
  3. Risk         → price mismatch, refund anomaly
  4. Sistem       → rule profile, versioning

Ana navigasyon bu ayrımı yansıtacak:

  Dashboard / Commerce / Finance / Risk & Audit / Settings

Tasarım Dili:
  - Zemin         : beyaz
  - Blok arkaplan : açık gri
  - Gelir         : yeşil
  - Nötr          : mavi
  - Bekleyen      : turuncu
  - Risk          : kırmızı
  - Font          : Inter veya Geist
  - Border radius : hafif
  - Ton           : güven veren, görsel karmaşadan uzak

Faz-1 UI Başarı Kriteri:
  Kullanıcı şu 5 soruya 3 saniye içinde cevap bulabilmeli:
    → Ne sattım?
    → Ne kazandım?
    → Ne kadar komisyon kesildi?
    → Param ne zaman hesabıma geçecek?
    → Risk var mı?


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. SELLER PANEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Seller için sistem "karmaşık finans motoru" gibi görünmemeli.
Ledger detayları gizlenir; wallet özeti gösterilir.

  Sidebar:
    Dashboard / Orders / Products / POS / Customers / Reports / Payouts

─── 3.1 Seller Dashboard ────────────────────────────────

  Üst bölüm (metrik kartlar):
    Today Sales | Today Orders | Pending Balance | Available Balance

  Orta bölüm:
    Son 10 sipariş listesi
    Varsa: küçük mismatch uyarı badge'i

  Alt bölüm:
    Son payout request durumu

─── 3.2 Orders Sayfası ──────────────────────────────────

  Liste kolonları:
    Order No | Channel | Status | Total | Commission | Seller Net | Mismatch | Created At

  Order Detail — 4 sekme:

    [1] Summary
    [2] Calculation Breakdown
          Subtotal
          − Discount
          + Tax
          − Commission
          = Seller Net
    [3] Ledger Entries   (default kapalı)
    [4] Audit Log

  NOT: Calculation Breakdown expand edilebilir olmalı.
  Kullanıcı "kara kutu" hissetmemeli; her kuruşun hesabı görünmeli.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. POS EKRANI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POS ayrı bir mental model; tablet/dokunmatik ekran önünde kullanılır.
Her aksiyon en fazla 2 dokunuşta tamamlanabilmeli.

─── 4.1 Ana Ekran Düzeni ────────────────────────────────

  Üst bar:
    Aktif kasa oturumu badge | Offline göstergesi

  Sol panel:
    Ürün grid'i
    Kategori filtreleri (chip)

  Sağ panel:
    Sepet listesi
    İndirim
    Toplam
    Ödeme butonu

─── 4.2 Vardiya (Session) Gate ──────────────────────────

  Kasa açılışında "Vardiyayı Başlat" ekranı zorunlu gelir.
  Kasa kodu seçimi ve açılış kasa sayımı girilmeden satış ekranı açılmaz.

─── 4.3 Offline Modu ────────────────────────────────────

  Bağlantı kesildiğinde üst banner:
    [Sarı]  Offline — 3 işlem kuyruğa alındı

  Bağlantı geldiğinde:
    [Yeşil] 3 işlem başarıyla senkronize edildi

  Queue Detay Ekranı:
    Order ID | Retry Count | Last Error | Status

─── 4.4 Price Mismatch UX ───────────────────────────────

  Mismatch tespit edildiğinde sipariş reddedilmez.
  Ödeme öncesi uyarı modalı çıkar:

    ┌─────────────────────────────────────┐
    │  ⚠  Fiyat Değişikliği Algılandı    │
    │                                     │
    │  Beklenen : 120 TL                  │
    │  Güncel   : 125 TL                  │
    │                                     │
    │  Satış devam edecek.                │
    │  Bu işlem risk paneline             │
    │  kaydedilecek.                      │
    │                                     │
    │  [ Devam Et ]      [ İptal ]        │
    └─────────────────────────────────────┘

  Modal korkutmadan bilgilendirmeli; satışı bloke etmemeli.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. ADMIN / FİNANS PANELİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bu panel sıradan admin paneli değil; muhasebe kontrol panelidir.

  Sidebar:
    Overview | Orders | Ledger | Wallets | Payouts |
    Refunds  | Mismatch Monitor | Audit | Settings

─── 5.1 Finance Overview ────────────────────────────────

  Metrik widget'lar:
    Total Platform Revenue (Today)
    Seller Pending Total
    Seller Available Total
    Open Payout Requests
    Refund Volume
    Price Mismatch Rate

  Ledger İnvaryant Widget:
    Ledger Invariant : OK
    Last Check       : 2 min ago

─── 5.2 Ledger Sayfası ──────────────────────────────────

  Tablo kolonları:
    Timestamp | Account Type | Direction (DR/CR) | Amount |
    Order | Type | Reference

  Filtreler:
    Seller | Tarih | Tip (ORDER / REFUND / PAYOUT) | Channel

  Teknik ama temiz; muhasebeci okuyabilmeli.

─── 5.3 Wallet Sayfası ──────────────────────────────────

  Seller wallet özeti:
    Pending | Available | Total Earned | Total Paid Out

  Alt kısım:
    Wallet activity timeline (ledger'dan türetilmiş)

─── 5.4 Payout Yönetimi ─────────────────────────────────

  Tablo kolonları:
    Seller | Requested Amount | Available | Status | Created | Actions

  Aksiyonlar:
    Approve | Reject | Mark as Paid

  "Mark as Paid" onay modalı:

    ┌──────────────────────────────────────────────┐
    │  Bu işlem immutable ledger kaydı             │
    │  oluşturacaktır.                             │
    │  Devam etmek istiyor musunuz?                │
    │                                              │
    │  [ Evet, Onayla ]        [ Vazgeç ]          │
    └──────────────────────────────────────────────┘

  Modal ciddi hissettirmeli; geri dönüşü olmadığını vurgulamalı.

─── 5.5 Mismatch Monitor ────────────────────────────────

  Üst bölüm:
    Mismatch rate zaman grafiği (fraud tespiti için kritik)

  Tablo kolonları:
    Order | Seller | POS Staff | Expected Price |
    Actual Price | Delta % | Timestamp

─── 5.6 Refund Ekranı ───────────────────────────────────

  Orijinal snapshot:
    Original Subtotal | Original Commission | Original Tax

  Altında:
    Refund hesaplaması
    Ledger entries önizlemesi

  Ekran sistemin deterministik olduğunu hissettirmeli.
  Her iade orijinal snapshot'a dayanmalı.

─── 5.7 Settings (Minimal) ──────────────────────────────

  Rule Profile seçimi
  Rule hash gösterimi
  Calculation version gösterimi
  "Active Profile" badge

  Bu alan advanced mode olarak etiketlenebilir.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. KRİTİK UX KARARLARI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. Calculation Breakdown her zaman expand edilebilir olmalı.
     "Kara kutu değil" hissi sistemin güvenilirliğini taşır.

  2. Payout onay modalı geri dönüşsüzlüğü vurgulamalı.
     Ledger'a yazılan kayıt immutable; bu kullanıcıya hissettirmeli.

  3. POS offline banner sürekli görünür olmalı.
     Kasiyer bağlantı durumunu tahmin etmemeli, görmeli.

  4. Mismatch modalı satışı bloke etmemeli.
     Bilgilendirme → devam; kasiyeri korkutmadan kayıt altına alma.

  5. Seller ile Finance paneli birbirinden net ayrılmalı.
     Seller ledger görmez; ledger detayı admin yetkisindedir.
