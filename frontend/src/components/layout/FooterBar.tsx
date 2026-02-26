import Link from 'next/link';
import {
  ArrowUpRight,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react';

export default function FooterBar() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-[#ddd2bf] bg-gradient-to-b from-[#f6efdf] via-[#f2e7d3] to-[#ebdec7] text-[#3b2f21]">
      <section className="px-4 py-8 md:px-6 md:py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#836d4d]">
              Nutopiano
            </p>
            <h2 className="text-2xl font-serif text-[#2b2116] md:text-3xl">
              Sade alışveriş deneyimi
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-[#574632]">
              Seller, POS ve checkout akışlarını tek bir çizgide buluşturuyoruz.
              Daha net ekranlar, daha hızlı operasyon.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#d4c4a8] bg-[#fff8ea] px-3 py-1 font-semibold text-[#684f34]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Üretim garantisi
              </span>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#836d4d]">
              Hızlı Linkler
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <Link href="/categories" className="group flex items-center justify-between rounded-lg px-1 py-1.5 transition hover:text-[#2e2217]">
                Kategoriler
                <ArrowUpRight className="h-4 w-4 text-[#9c7b4e] group-hover:text-[#2e2217]" />
              </Link>
              <Link href="/products" className="group flex items-center justify-between rounded-lg px-1 py-1.5 transition hover:text-[#2e2217]">
                Ürünler
                <ArrowUpRight className="h-4 w-4 text-[#9c7b4e] group-hover:text-[#2e2217]" />
              </Link>
              <Link href="/checkout" className="group flex items-center justify-between rounded-lg px-1 py-1.5 transition hover:text-[#2e2217]">
                Checkout
                <ArrowUpRight className="h-4 w-4 text-[#9c7b4e] group-hover:text-[#2e2217]" />
              </Link>
              <Link href="/account/orders" className="group flex items-center justify-between rounded-lg px-1 py-1.5 transition hover:text-[#2e2217]">
                Sipariş Takibi
                <ArrowUpRight className="h-4 w-4 text-[#9c7b4e] group-hover:text-[#2e2217]" />
              </Link>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#836d4d]">
              İletişim
            </p>
            <div className="mt-4 space-y-2 text-sm text-[#574632]">
              <p className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#8f734d]" />
                +90 212 000 00 00
              </p>
              <p className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#8f734d]" />
                info@nutopiano.com
              </p>
              <Link href="https://maps.app.goo.gl/" target="_blank" className="inline-flex items-center gap-2 transition hover:text-[#2e2217]">
                <MapPin className="h-4 w-4 text-[#8f734d]" />
                İstanbul / Türkiye
              </Link>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Link href="https://instagram.com" target="_blank" aria-label="Instagram" className="rounded-full border border-[#d7c9b1] bg-[#fff9ec] p-2 transition hover:bg-[#f1e4ca]">
                <Instagram className="h-4 w-4 text-[#6a5236]" />
              </Link>
              <Link href="https://facebook.com" target="_blank" aria-label="Facebook" className="rounded-full border border-[#d7c9b1] bg-[#fff9ec] p-2 transition hover:bg-[#f1e4ca]">
                <Facebook className="h-4 w-4 text-[#6a5236]" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#d7c9af] px-4 py-4 text-xs text-[#7a6446] md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>© {year} Nutopiano. Tüm hakları saklıdır.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/legal/privacy" className="transition hover:text-[#302317]">
              KVKK & Gizlilik
            </Link>
            <Link href="/legal/distance-sales" className="transition hover:text-[#302317]">
              Mesafeli satış sözleşmesi
            </Link>
            <Link href="/legal/kvkk" className="transition hover:text-[#302317]">
              Kullanım koşulları
            </Link>
          </div>
        </div>
      </section>

      <Link
        href="https://wa.me/905551112233"
        target="_blank"
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-lg)] transition hover:scale-105 hover:shadow-[var(--shadow-xl)] z-50"
      >
        WhatsApp
      </Link>
    </footer>
  );
}
