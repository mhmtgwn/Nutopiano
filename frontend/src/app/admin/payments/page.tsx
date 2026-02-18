import Link from 'next/link';
import { ArrowUpRight, Banknote, CreditCard, ShieldCheck } from 'lucide-react';

const methods = [
  {
    title: 'Havale / EFT',
    description: 'Banka bilgilerini ve açıklama metnini yönetin.',
    icon: Banknote,
  },
  {
    title: 'iyzico',
    description: 'API anahtarları, test/canlı modu ve callback ayarları.',
    icon: CreditCard,
  },
  {
    title: 'PayTR',
    description: 'Merchant bilgileri, hash doğrulama ve başarısız senaryolar.',
    icon: ShieldCheck,
  },
];

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <section className="border-b border-[var(--neutral-200)] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Ödeme
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Ödeme ayarları
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Aktif ödeme yöntemlerini ve API anahtarlarını yönetin.
            </p>
          </div>
          <Link
            href="/admin/payments"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
          >
            Güncelle <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {methods.map((method) => {
          const Icon = method.icon;
          return (
            <div
              key={method.title}
              className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6"
            >
              <Icon className="h-5 w-5 text-[var(--primary-800)]/70" />
              <h2 className="mt-4 text-2xl font-serif text-[var(--primary-800)]">
                {method.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--neutral-600)]">{method.description}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
