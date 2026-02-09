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
      <section className="rounded-[32px] border border-[#1A3C34]/10 bg-white/90 px-6 py-6 shadow-[0_30px_90px_rgba(26,60,52,0.12)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
              Kapıya Hizmet
            </p>
            <h1 className="text-3xl font-serif text-[#1A3C34] md:text-4xl">
              Hizmet talepleri
            </h1>
            <p className="text-sm text-[#5C5C5C]">
              Kapıya hizmet isteklerini yönetin, fiyatları admin panelden düzenleyin.
            </p>
          </div>
          <Link
            href="/admin/services"
            className="inline-flex items-center gap-2 rounded-full border border-[#1A3C34]/15 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#1A3C34]"
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
              className="rounded-[28px] border border-[#E0D7C6] bg-white/90 px-6 py-6 shadow-[0_20px_60px_rgba(26,60,52,0.08)]"
            >
              <Icon className="h-5 w-5 text-[#C5A059]" />
              <h2 className="mt-4 text-2xl font-serif text-[#1A3C34]">
                {card.title}
              </h2>
              <p className="mt-2 text-sm text-[#5C5C5C]">{card.description}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
