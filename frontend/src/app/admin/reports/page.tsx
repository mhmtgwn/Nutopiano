import { BarChart3, FileText, TrendingUp } from 'lucide-react';

const cards = [
  {
    title: 'Satış raporu',
    description: 'Toplam sipariş adedi, ciro ve trend analizi (Faz 1: temel metrikler).',
    icon: TrendingUp,
  },
  {
    title: 'Satıcı performansı',
    description: 'Satıcı bazlı satış, komisyon ve payout özetleri (Faz 1: listeleme).',
    icon: BarChart3,
  },
  {
    title: 'Dışa aktarım',
    description: 'CSV/XLS export (Faz 1 sonrası).',
    icon: FileText,
  },
];

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <section className="border-b border-[var(--neutral-200)] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Raporlar
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Platform raporları
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Faz 1 kapsamında temel satış ve performans metrikleri.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6"
            >
              <Icon className="h-5 w-5 text-[var(--primary-800)]/70" />
              <h2 className="mt-4 text-2xl font-serif text-[var(--primary-800)]">{card.title}</h2>
              <p className="mt-2 text-sm text-[var(--neutral-600)]">{card.description}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          Durum
        </p>
        <p className="mt-2 text-sm text-[var(--neutral-600)]">
          Bu ekran Faz 1 için iskelet olarak hazır. Sonraki adımda backend rapor endpointleri eklenip KPI’lar gerçek veriye bağlanacak.
        </p>
      </section>
    </div>
  );
}
