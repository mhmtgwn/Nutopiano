import type { Metadata } from 'next';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/account/orders', label: 'Siparişler' },
  { href: '/account/addresses', label: 'Adresler' },
  { href: '/account/favorites', label: 'Favoriler' },
  { href: '/account/reviews', label: 'Yorumlar' },
  { href: '/account/profile', label: 'Profil' },
  { href: '/account/settings', label: 'Ayarlar' },
] as const;

export const metadata: Metadata = {
  title: 'Hesabım | Nutopiano',
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-140px)] bg-[var(--neutral-50)]">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[240px_1fr] md:px-6 md:py-10">
        <aside className="overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-md)]">
          <div className="border-b border-[var(--neutral-200)] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
              Hesabım
            </p>
          </div>
          <nav className="flex flex-col p-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[var(--radius-lg)] px-3 py-2 text-sm font-medium text-[var(--primary-800)] hover:bg-[var(--neutral-50)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
