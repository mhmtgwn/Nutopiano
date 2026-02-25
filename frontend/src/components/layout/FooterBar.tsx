import Link from 'next/link';
import { Facebook, Instagram, Phone, ShieldCheck, MapPin, Mail, ArrowUpRight, Bolt } from 'lucide-react';

export default function FooterBar() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-[var(--neutral-200)] bg-[#102822] text-[var(--brand-sand)]">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <div className="rounded-[var(--radius-3xl)] border border-white/12 bg-white/[0.03] p-6 shadow-[var(--shadow-xl)] backdrop-blur md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.45fr_1fr_1fr]">
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--brand-sand)]/65">
                Nutopiano Commerce
              </p>
              <h2 className="text-2xl font-serif text-white md:text-3xl">
                Mağazanı büyüten sade ve güçlü akış
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-[var(--brand-sand)]/80">
                Seller, POS ve checkout deneyimini tek bir ritimde buluşturuyoruz.
                Daha az sürtünme, daha net operasyon, daha hızlı satış.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-3 py-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--brand-copper)]" />
                  Üretim garantisi
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-3 py-1">
                  <Bolt className="h-3.5 w-3.5 text-[var(--brand-copper)]" />
                  Canlı POS desteği
                </span>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--brand-sand)]/60">
                Hızlı Erişim
              </p>
              <div className="grid gap-2 text-[var(--brand-sand)]/82">
                <Link href="/categories" className="inline-flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 transition hover:border-white/20 hover:text-white">
                  Kategoriler <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link href="/checkout" className="inline-flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 transition hover:border-white/20 hover:text-white">
                  Checkout <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link href="/account/orders" className="inline-flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 transition hover:border-white/20 hover:text-white">
                  Sipariş Takibi <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link href="/pos" className="inline-flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 transition hover:border-white/20 hover:text-white">
                  POS Terminal <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--brand-sand)]/60">
                İletişim
              </p>
              <div className="space-y-2 text-[var(--brand-sand)]/82">
                <p className="inline-flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[var(--brand-copper)]" />
                  +90 212 000 00 00
                </p>
                <p className="inline-flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[var(--brand-copper)]" />
                  info@nutopiano.com
                </p>
                <Link
                  href="https://maps.app.goo.gl/"
                  target="_blank"
                  className="inline-flex items-center gap-2 text-[var(--brand-sand)]/82 transition hover:text-white"
                >
                  <MapPin className="h-4 w-4 text-[var(--brand-copper)]" />
                  İstanbul / Türkiye
                </Link>
              </div>
              <div className="flex items-center gap-3 pt-1 text-[var(--brand-sand)]">
                <Link href="https://instagram.com" target="_blank" aria-label="Instagram" className="rounded-full border border-white/15 p-2 transition hover:border-white/30 hover:text-white">
                  <Instagram className="h-4 w-4" />
                </Link>
                <Link href="https://facebook.com" target="_blank" aria-label="Facebook" className="rounded-full border border-white/15 p-2 transition hover:border-white/30 hover:text-white">
                  <Facebook className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--brand-sand)]/62">
          <p>© {year} Nutopiano. Tüm hakları saklıdır.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/legal/privacy" className="transition hover:text-white">
              KVKK & Gizlilik
            </Link>
            <Link href="/legal/distance-sales" className="transition hover:text-white">
              Mesafeli satış sözleşmesi
            </Link>
            <Link href="/legal/kvkk" className="transition hover:text-white">
              Kullanım koşulları
            </Link>
          </div>
        </div>
      </div>

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
