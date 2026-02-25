# Nutopiano Root UI/UX Redesign Queue

## Amaç
POS, Admin, Checkout ve Hesap ekranlarında tek bir görsel dil, daha net bilgi mimarisi ve daha düşük operasyonel sürtünme sağlamak.

## Kuyruk 1 - Tasarım Temeli (Tamamlandı)
- Global experience tokenları ve yüzey katmanları (`surface-panel`, `surface-panel-muted`, `app-shell`).
- Root layout arkaplan ve içerik katman ayrımı.
- Buton sisteminde görsel hiyerarşi ve etkileşim güçlendirmesi.

## Kuyruk 2 - Global Navigasyon (Tamamlandı)
- Header: üst bilgi bandı, daha görünür shop/panel/POS erişimleri, geliştirilmiş arama.
- Footer: çok kolonlu bilgi mimarisi, hızlı erişim kartları, iletişim alanı güçlendirmesi.

## Kuyruk 3 - Yönetim Deneyimi (Tamamlandı)
- AdminShell: yeni topbar, daha okunaklı sidebar, içerik yüzeyi standardizasyonu.
- Mobil drawer görsel uyumluluğu.

## Kuyruk 4 - Checkout + Hesap (Tamamlandı)
- Checkout kart sisteminin tek dilde sadeleştirilmesi.
- Sipariş özeti sticky davranışı (desktop).
- Profil/Ayarlar sekme, başlık ve modül kartlarının güçlendirilmesi.

## Kuyruk 5 - POS Görsel Yenileme (Tamamlandı, Faz-1)
- POS üst bar modernizasyonu (durum/sync görünürlüğü).
- POS dashboard metrik kartları (bağlantı, kuyruk, vardiya, toplam).
- Ana operasyon kartlarında yeni yüzey dili.

## Kuyruk 6 - Sertleştirme ve Yayın
- `npm run lint -w frontend`
- `npm run build -w frontend`
- Git commit + push
- Deploy script/workflow tetikleme

## Sonraki Faz (Kuyrukta)
- POS içerisindeki detay panelin tamamen modülerleştirilmesi (subcomponent extraction).
- Admin sayfa içeriklerinin (orders/products/customers vb.) tek tip dashboard kart sistemine taşınması.
- Checkout için form alanlarında inline doğrulama mesajlarının görsel standardizasyonu.
