import Link from 'next/link';
import { ArrowUpRight, FileText, Globe, Palette, Settings } from 'lucide-react';

const cards = [
  {
    title: 'Site ayarları',
    description: 'Firma adı, iletişim bilgileri ve temel parametreler.',
    icon: Settings,
  },
  {
    title: 'Yasal metinler',
    description: 'KVKK, mesafeli satış ve gizlilik metinlerini düzenleyin.',
    icon: FileText,
  },
  {
    title: 'Marka görünümü',
    description: 'Logo, renk paleti ve görsel ayarları güncelleyin.',
    icon: Palette,
  },
  {
    title: 'SEO ayarları',
    description: 'Canonical, OG ve arama motoru yapılandırmaları.',
    icon: Globe,
  },
];

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <section className="border-b border-[var(--neutral-200)] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Ayarlar
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Genel ayarlar
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Site genel ayarları, yasal metinler ve marka görünümü.
            </p>
          </div>
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
          >
            Kaydet <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6"
            >
              <Icon className="h-5 w-5 text-[var(--primary-800)]/70" />
              <h2 className="mt-4 text-2xl font-serif text-[var(--primary-800)]">
                {card.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--neutral-600)]">{card.description}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
