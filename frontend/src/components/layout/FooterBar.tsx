import Link from 'next/link';
import {
  Facebook,
  Instagram,
  Mail,
  Phone,
} from 'lucide-react';

export default function FooterBar() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-[var(--neutral-200)] bg-white/90 text-[var(--primary-800)] backdrop-blur-md">
      <section className="px-4 py-6 md:px-6 md:py-7">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--neutral-500)]">
              Nutopiano
            </p>
            <p className="mt-1 text-sm text-[var(--neutral-600)]">
              Sade alışveriş ve operasyon deneyimi.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-3 text-sm font-medium text-[var(--neutral-700)]">
            <Link href="/categories" className="rounded-full px-3 py-1.5 transition hover:bg-[var(--neutral-100)] hover:text-[var(--primary-800)]">
              Kategoriler
            </Link>
            <Link href="/products" className="rounded-full px-3 py-1.5 transition hover:bg-[var(--neutral-100)] hover:text-[var(--primary-800)]">
              Ürünler
            </Link>
            <Link href="/checkout" className="rounded-full px-3 py-1.5 transition hover:bg-[var(--neutral-100)] hover:text-[var(--primary-800)]">
              Checkout
            </Link>
            <Link href="/account/orders" className="rounded-full px-3 py-1.5 transition hover:bg-[var(--neutral-100)] hover:text-[var(--primary-800)]">
              Sipariş Takibi
            </Link>
          </nav>

          <div className="flex items-center gap-2 text-[var(--neutral-600)]">
            <Link href="tel:+902120000000" aria-label="Telefon" className="rounded-full border border-[var(--neutral-200)] p-2 transition hover:border-[var(--neutral-300)] hover:text-[var(--primary-800)]">
              <Phone className="h-4 w-4" />
            </Link>
            <Link href="mailto:info@nutopiano.com" aria-label="E-posta" className="rounded-full border border-[var(--neutral-200)] p-2 transition hover:border-[var(--neutral-300)] hover:text-[var(--primary-800)]">
              <Mail className="h-4 w-4" />
            </Link>
            <Link href="https://instagram.com" target="_blank" aria-label="Instagram" className="rounded-full border border-[var(--neutral-200)] p-2 transition hover:border-[var(--neutral-300)] hover:text-[var(--primary-800)]">
              <Instagram className="h-4 w-4" />
            </Link>
            <Link href="https://facebook.com" target="_blank" aria-label="Facebook" className="rounded-full border border-[var(--neutral-200)] p-2 transition hover:border-[var(--neutral-300)] hover:text-[var(--primary-800)]">
              <Facebook className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--neutral-200)] px-4 py-4 text-xs text-[var(--neutral-500)] md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>© {year} Nutopiano. Tüm hakları saklıdır.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/legal/privacy" className="transition hover:text-[var(--primary-800)]">
              KVKK & Gizlilik
            </Link>
            <Link href="/legal/distance-sales" className="transition hover:text-[var(--primary-800)]">
              Mesafeli satış sözleşmesi
            </Link>
            <Link href="/legal/kvkk" className="transition hover:text-[var(--primary-800)]">
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
