import Link from 'next/link';
import { Facebook, Instagram, Phone, ShieldCheck, MapPin } from 'lucide-react';

export default function FooterBar() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-[#1A3C34]/10 bg-[#F3EEE3] text-[#1A3C34]">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 md:px-6">
        <div className="grid gap-8 md:grid-cols-[1.3fr_1fr_1fr]">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
              Nutopiano
            </p>
            <p className="text-sm leading-relaxed text-[#3E2723]">
              Yerli üretim güvencesiyle butik e-ticaret. Ürün seçiminden stok
              yönetimine kadar her adımda manuel kalite kontrol gerçekleştiriyoruz.
            </p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Üretim garantisi
              </span>
              <Link
                href="https://maps.app.goo.gl/"
                target="_blank"
                className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 hover:-translate-y-0.5"
              >
                <MapPin className="h-3.5 w-3.5" /> Google Maps
              </Link>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
              Shop
            </p>
            <div className="flex flex-col gap-2 text-[#3E2723]">
              <Link href="/products" className="hover:text-[#1A3C34]">
                Ürün kataloğu
              </Link>
              <Link href="/products" className="hover:text-[#1A3C34]">
                Koleksiyonlar
              </Link>
              <Link href="/checkout" className="hover:text-[#1A3C34]">
                Ödeme ve teslimat
              </Link>
              <Link href="/account/orders" className="hover:text-[#1A3C34]">
                Sipariş takibi
              </Link>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
              İletişim
            </p>
            <div className="space-y-2 text-[#3E2723]">
              <p className="text-sm">+90 212 000 00 00</p>
              <p className="text-xs text-[#5C5C5C]">
                info@nutopiano.com<br />İstanbul / Türkiye
              </p>
            </div>
            <div className="flex items-center gap-3 text-[#1A3C34]">
              <Link href="https://instagram.com" target="_blank" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </Link>
              <Link href="https://facebook.com" target="_blank" aria-label="Facebook">
                <Facebook className="h-5 w-5" />
              </Link>
              <Link href="tel:+902120000000" aria-label="Telefon">
                <Phone className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1A3C34]/10 pt-4 text-xs text-[#5C5C5C]">
          <p>© {year} Nutopiano. Tüm hakları saklıdır.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/legal/privacy" className="hover:text-[#1A3C34]">
              KVKK & Gizlilik
            </Link>
            <Link href="/legal/distance-sales" className="hover:text-[#1A3C34]">
              Mesafeli satış sözleşmesi
            </Link>
            <Link href="/legal/kvkk" className="hover:text-[#1A3C34]">
              Üretim güvencesi
            </Link>
          </div>
        </div>
      </div>

      <Link
        href="https://wa.me/905551112233"
        target="_blank"
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:scale-105"
      >
        WhatsApp
      </Link>
    </footer>
  );
}
