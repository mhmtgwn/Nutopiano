import Link from 'next/link';
import { ArrowUpRight, MapPin, RefreshCcw, Scale, Truck } from 'lucide-react';

const cards = [
  {
    title: 'Hizmet türleri',
    description: 'KG, mesafe veya işlem bazlı hizmetleri yönetin.',
    icon: Truck,
  },
  {
    title: 'Fiyat matrisi',
    description: 'Fiyatı kg/mesafe/işlem kombinasyonlarına göre tanımlayın.',
    icon: Scale,
  },
  {
    title: 'Talep yönetimi',
    description: 'Gelen talepleri sırala, durum güncelle ve takip et.',
    icon: MapPin,
  },
  {
    title: 'Durum akışı',
    description: 'Hazırlanıyor, yolda, tamamlandı gibi durumları kontrol et.',
    icon: RefreshCcw,
  },
];

export default function AdminServicesPage() {
  return (
    <div className="space-y-6">
      <section className="border-b border-[var(--neutral-200)] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Kapıya Hizmet
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Hizmet talepleri
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Kapıya hizmet isteklerini yönetin, fiyatları admin panelden düzenleyin.
            </p>
          </div>
          <Link
            href="/admin/services"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
          >
            Yeni hizmet <ArrowUpRight className="h-4 w-4" />
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
