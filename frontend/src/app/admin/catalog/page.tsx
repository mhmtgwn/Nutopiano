import Link from 'next/link';
import { ArrowUpRight, Package, Tags } from 'lucide-react';

const cards = [
  {
    title: 'Ürün yönetimi',
    description: 'Marketplace ürünlerini oluşturun, güncelleyin, fiyat/stock durumlarını yönetin.',
    href: '/admin/products',
    icon: Package,
  },
  {
    title: 'Kategori yönetimi',
    description: 'Kategori ağacını yönetin ve vitrin sıralamasını düzenleyin.',
    href: '/admin/categories',
    icon: Tags,
  },
];

export default function AdminCatalogPage() {
  return (
    <div className="space-y-6">
      <section className="border-b border-[var(--neutral-200)] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Katalog
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Katalog yönetimi
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Ürün ve kategori içeriklerini platform panelinden yönetin.
            </p>
          </div>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
          >
            Ürünlere git <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6 transition hover:bg-[var(--neutral-50)]"
            >
              <Icon className="h-5 w-5 text-[var(--primary-800)]/70" />
              <h2 className="mt-4 text-2xl font-serif text-[var(--primary-800)]">{card.title}</h2>
              <p className="mt-2 text-sm text-[var(--neutral-600)]">{card.description}</p>
              <div className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)]">
                Aç <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
